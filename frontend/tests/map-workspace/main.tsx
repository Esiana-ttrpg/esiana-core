import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { WikiProvider, useWiki } from '../../src/contexts/WikiContext';
import { MapViewerPage } from '../../src/pages/MapViewerPage';
import '../../src/index.css';

function Harness() {
  const { refresh } = useWiki();
  return <><nav><Link to="/campaigns/demo/maps/second">Second map</Link><button onClick={() => void refresh()}>Refresh permissions</button></nav><MapViewerPage /></>;
}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/campaigns/demo/maps/first']}><AuthProvider><Routes><Route path="/campaigns/:campaignHandle/maps/:assetId" element={<WikiProvider><Harness /></WikiProvider>} /></Routes></AuthProvider></MemoryRouter>);
