import React from 'react';
import Helmet from 'react-helmet';

const OgImage = ({ children, pageContext: { ogImageUrl, ogImageWidth, ogImageHeight } }) => {
  if (ogImageUrl) {
    return (
      <>
        <Helmet>
          <meta property="og:image" content={ogImageUrl} />,
          <meta property="og:image:width" content={ogImageWidth} />,
          <meta property="og:image:height" content={ogImageHeight} />,
        </Helmet>
        {children}
      </>
    );
  } else {
    return children;
  }
};

export default OgImage;
