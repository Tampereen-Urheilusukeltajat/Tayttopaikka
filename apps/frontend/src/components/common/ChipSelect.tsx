import React, { useState } from 'react';
import { Dropdown } from 'react-bootstrap';

export type ChipSelectOption = {
  value: string;
  label: string;
};

export type ChipSelectOptionGroup = {
  groupLabel: string;
  options: ChipSelectOption[];
};

type ChipSelectProps = {
  label: string;
  optionGroups: ChipSelectOptionGroup[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  errorText?: string;
  placeholder?: string;
  style?: React.CSSProperties;
};

export const ChipSelect: React.FC<ChipSelectProps> = ({
  label,
  optionGroups,
  selectedValues,
  onChange,
  disabled = false,
  errorText,
  placeholder = 'Valitse...',
  style,
}) => {
  const [open, setOpen] = useState(false);

  const allOptions = optionGroups.flatMap((g) => g.options);

  const toggle = (value: string): void => {
    const next = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onChange(next);
  };

  const remove = (value: string, e: React.MouseEvent): void => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== value));
  };

  return (
    <div style={style}>
      <label className="field-title">{label}</label>
      <Dropdown show={open && !disabled} onToggle={setOpen}>
        <Dropdown.Toggle
          as="div"
          bsPrefix="chip-select-toggle"
          className={`form-control d-flex flex-column gap-2${errorText ? ' is-invalid' : ''}`}
          style={{
            cursor: disabled ? 'default' : 'pointer',
            minHeight: '38px',
            height: 'auto',
            paddingTop: '0.4rem',
            paddingBottom: '0.4rem',
            paddingRight: '2.25rem',
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '0.55rem',
              right: '0.75rem',
              width: '16px',
              height: '12px',
              pointerEvents: 'none',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px 12px',
              transition: 'transform 0.2s ease',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transformOrigin: 'center',
            }}
          />
          {selectedValues.length === 0 ? (
            <span className="text-muted">{placeholder}</span>
          ) : (
            selectedValues.map((val) => {
              const option = allOptions.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="badge rounded-pill d-flex align-items-center justify-content-between gap-2"
                  style={{
                    padding: '0.45em 0.75em',
                    fontSize: '1rem',
                    fontWeight: 500,
                    backgroundColor: '#d9e1e9',
                    color: '#1b2631',
                    border: '1px solid #526578',
                  }}
                >
                  <span>{option?.label ?? val}</span>
                  {!disabled && (
                    <button
                      type="button"
                      className="btn-close"
                      style={{ fontSize: '0.75rem', padding: '0.4em' }}
                      onClick={(e) => remove(val, e)}
                      aria-label="Poista"
                    />
                  )}
                </span>
              );
            })
          )}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {optionGroups.map((group) => (
            <React.Fragment key={group.groupLabel}>
              {optionGroups.length > 1 && (
                <Dropdown.Header>{group.groupLabel}</Dropdown.Header>
              )}
              {group.options.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <Dropdown.Item
                    key={option.value}
                    onClick={() => toggle(option.value)}
                    active={isSelected}
                    style={
                      isSelected
                        ? { backgroundColor: '#526578', color: '#ffffff' }
                        : undefined
                    }
                  >
                    {option.label}
                  </Dropdown.Item>
                );
              })}
            </React.Fragment>
          ))}
        </Dropdown.Menu>
      </Dropdown>
      {errorText && (
        <div className="invalid-feedback d-block">{errorText}</div>
      )}
    </div>
  );
};
