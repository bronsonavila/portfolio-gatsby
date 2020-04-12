import React, { useEffect, useRef, useState } from 'react';
import { graphql } from 'gatsby';
import Img from 'gatsby-image/withIEPolyfill';

import GalleryModal from '../components/GalleryModal';

import { lazyLoad } from '../utils/lazyLoad';
import { moveElementsRelativeToMouse } from '../utils/moveElementsRelativeToMouse';

const cardSize = 275;
const delay = 300; // For animations.

/**
 * Changes the display of `.gallery__card` elements from `none` to `block` at
 * staggered intervals. This allows the first batch of initially displayed
 * cards to be revealed in sequential order rather than all at once. This is
 * because the `lazyLoad` IntersectionObserver will not detect elements until
 * `display: none` has been changed to a visible value.
 */
const displayGalleryCards = () => {
  const cards = [...document.querySelectorAll('.gallery__card')];

  cards.forEach((card, index) => {
    // Must trigger before `observerCallback` runs:
    setTimeout(() => card.classList.add('is-visible'), (index * delay) / 3.666);
  });
};

/**
 * Callback for the `lazyLoad` IntersectionObserver. Animates the entrance of
 * each `.gallery__card` element.
 *
 * @param {Array} entries - An array of IntersectionObserverEntry objects.
 */
const observerCallback = entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('has-entered'), delay / 3);
    }
  });
};

export default ({ data }) => {
  const content = data.markdownRemark;
  const images = data.allFile.edges;

  const [activeCard, setActiveCard] = useState(null);
  const cardRefs = images.map(image => useRef(null));
  const galleryCardsRef = useRef(null);
  const modalRef = useRef(null);

  const modalHeight = 620.666; // height / width = 0.666...
  const modalWidth = 931;

  useEffect(() => {
    // Handle lazy loading:
    displayGalleryCards();
    lazyLoad(observerCallback);

    // Animate position of gallery cards on hover:
    moveElementsRelativeToMouse({
      additionalTransformValues: 'scale(1.025)',
      containerSelector: '.gallery__card-container',
    });
  });

  // Control modal:
  useEffect(() => {
    if (!activeCard) return;

    const activeCardX =
      activeCard.offsetLeft - modalWidth / 2 + activeCard.offsetWidth / 2;
    const activeCardY =
      activeCard.offsetTop - modalHeight / 2 + activeCard.offsetHeight / 2;
    activeCard.style = '';

    const modal = modalRef.current;
    const modalImageContainer = modal.childNodes[0];
    modal.classList.remove('is-active');
    modal.style.transform = `
      translate(${activeCardX}px, ${activeCardY}px)
      scaleX(${cardSize / modalWidth})
      scaleY(${cardSize / modalHeight})`;
    modalImageContainer.style.transform = `
      scaleX(${modalWidth / cardSize})
      scaleY(${modalHeight / cardSize})`;

    setTimeout(() => {
      const body = document.querySelector('body');
      const centerX = body.offsetWidth / 2 - modalWidth / 2;
      const centerY =
        body.offsetHeight / 2 -
        modalHeight / 2 -
        galleryCardsRef.current.getBoundingClientRect().top / 2 +
        window.scrollY / 2;

      modal.classList.add('is-active');
      modal.style.transform = `
        translate(${centerX + 0.5}px, ${centerY}px)
        scaleX(1) scaleY(1)`;
      modalImageContainer.style.transform = 'scaleX(1) scaleY(1)';
    }, delay * 2);
  }, [activeCard]);

  return (
    <section className="gallery">
      <div>
        <h1>{content.frontmatter.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: content.html }} />
      </div>
      <div className="gallery__cards" ref={galleryCardsRef}>
        <GalleryModal
          activeCardIndex={activeCard && Number(activeCard.dataset.index)}
          cardSize={cardSize}
          height={modalHeight}
          images={images}
          ref={modalRef}
          width={modalWidth}
        />
        {images.map((image, index) => (
          <div className="gallery__card-container" key={index}>
            <div
              className="gallery__card observable"
              data-index={index}
              data-node-base={image.node.base}
              data-observer-root-margin="0px 0px 25%" // Best with bottom margin.
              onClick={e => setActiveCard(cardRefs[index].current)}
              onMouseDown={e => (cardRefs[index].current.style = '')}
              ref={cardRefs[index]}
            >
              <Img
                alt={image.node.base.split('.')[0]}
                className="h-full w-full"
                fluid={image.node.childImageSharp.fluid}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export const query = graphql`
  query($slug: String!, $relativeDirectory: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      html
      frontmatter {
        title
      }
    }
    allFile(
      filter: {
        sourceInstanceName: { eq: "images" }
        relativeDirectory: { eq: $relativeDirectory }
      }
      sort: { fields: name }
    ) {
      edges {
        node {
          base
          childImageSharp {
            fixed(width: 929, quality: 100) {
              ...GatsbyImageSharpFixed
            }
            fluid(maxWidth: 500) {
              ...GatsbyImageSharpFluid
            }
          }
        }
      }
    }
  }
`;
