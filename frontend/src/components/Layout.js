import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f17' }}>
      <Navbar />
      <main>{children}</main>
    </div>
  );
}