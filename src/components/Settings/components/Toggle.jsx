import React from 'react';

export default function Toggle({ checked, onChange, disabled }) {
  return (
    <div
      className={`qq-settings-toggle${checked ? ' on' : ''}${disabled ? ' disabled' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
    />
  );
}
