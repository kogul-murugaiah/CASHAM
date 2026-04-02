import { useState } from 'react';

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  onAddNew?: (name: string) => Promise<void>;
  addNewLabel?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomDropdown = ({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  onAddNew,
  addNewLabel = "+ Add new",
  className = "",
  disabled = false,
}: CustomDropdownProps) => {
  const [showNewInput, setShowNewInput] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  const handleAddNew = async () => {
    if (!onAddNew) return;

    try {
      setIsAdding(true);
      setError('');
      await onAddNew(newItemName);
      setNewItemName('');
      setShowNewInput(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setNewItemName('');
    setError('');
    setShowNewInput(false);
  };

  if (showNewInput && onAddNew) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Enter new item name"
          className={`w-full rounded-xl border-0 bg-slate-700/50 px-4 py-3 text-slate-200 shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6 ${className}`}
          disabled={isAdding}
          autoFocus
        />
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddNew}
            disabled={isAdding || !newItemName.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAdding ? 'Adding...' : 'Add'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isAdding}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === 'add-new') {
            setShowNewInput(true);
          } else {
            onChange(e.target.value);
          }
        }}
        className={`w-full rounded-xl border-0 bg-slate-700/50 px-4 py-3 text-slate-200 shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6 ${className}`}
        disabled={disabled}
      >
        <option value="" className="text-slate-900">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-slate-900">
            {option.label}
          </option>
        ))}
        {onAddNew && (
          <option value="add-new" className="text-slate-900">{addNewLabel}</option>
        )}
      </select>
    </div>
  );
};
