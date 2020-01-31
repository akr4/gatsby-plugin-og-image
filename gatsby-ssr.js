import OgImage from './OgImage';
import React from 'react';

export const wrapPageElement = ({ element, props }) => <OgImage {...props}>{element}</OgImage>;
