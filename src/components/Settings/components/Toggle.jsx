import React from 'react';

export default function Toggle({ checked, onChange }) {
  return (
    <div
      className={`qq-settings-toggle${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    />
  );
}
