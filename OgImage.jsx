import React from 'react';
import Helmet from 'react-helmet';

const OgImage = ({ children, pageContext: { ogImageUrl } }) => {
  if (ogImageUrl) {
    return (
      <>
        <Helmet>
          <meta property="og:image" content={ogImageUrl} />,
          <meta property="og:image:width" content={1200} />,
          <meta property="og:image:height" content={630} />,
        </Helmet>
        {children}
      </>
    );
  } else {
    return children;
  }
};

export default OgImage;
