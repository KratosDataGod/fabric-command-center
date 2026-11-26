//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { createRoot } from 'react-dom/client';

import { applyBrand } from './brand/apply-brand';
import { Root } from './Root';
import { bootstrapAuth } from './services/rayfin-auth.service';

import './global.css';

applyBrand();

const root = createRoot(document.getElementById('root')!);

if (import.meta.env.MODE === 'demo') {
  // `npm run demo`: synthetic data, no Fabric sign-in. Removed from real builds.
  const { DemoRoot } = await import('./demo/demo-root');
  root.render(<DemoRoot />);
} else {
  const rayfinAuthService = await bootstrapAuth();
  root.render(<Root rayfinAuthService={rayfinAuthService} />);
}
