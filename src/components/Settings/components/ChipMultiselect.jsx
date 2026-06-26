import React from 'react';

export default function ChipMultiselect({ value = [], options = [], onChange, placeholder }) {
  const selectedSet = new Set(value);
  const available   = options.filter(o => !selectedSet.has(o.id));

  function removeChip(id) {
    onChange(value.filter(v => v !== id));
  }

  function addChip(e) {
    const id = parseInt(e.target.value, 10);
    if (!id) return;
    onChange([...value, id]);
    e.target.value = '';
  }

  function getName(id) {
    const opt = options.find(o => o.id === id);
    return opt ? opt.name : String(id);
  }

  return (
    <div className="qq-chip-multiselect">
      {value.map(id => (
        <span key={id} className="qq-chip">
          {getName(id)}
          <span className="qq-chip-x" onClick={() => removeChip(id)}>×</span>
        </span>
      ))}
      {available.length > 0 && (
        <select className="qq-chip-input" onChange={addChip} value="">
          <option value="">{placeholder}</option>
          {available.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
