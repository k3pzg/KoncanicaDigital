const OTHER_OPTION_VALUE = '__other__';

export function FishEntryRow({
  row,
  index,
  species,
  categories,
  disabled,
  onChange,
  onDelete,
  showDelete
}) {
  const rowPrefix = `Red ${index + 1}`;

  return (
    <fieldset className="fish-entry-row" disabled={disabled}>
      <legend>{rowPrefix}</legend>

      <label>
        Vrsta
        <select name="species_id" value={row.species_id} onChange={(event) => onChange(row.id, event)}>
          <option value="">Odaberite vrstu</option>
          {species.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {item.label}
            </option>
          ))}
          <option value={OTHER_OPTION_VALUE}>Ostalo...</option>
        </select>
      </label>

      {row.species_id === OTHER_OPTION_VALUE ? (
        <label>
          Unesite novu vrstu
          <input type="text" name="new_species_label" value={row.new_species_label} onChange={(event) => onChange(row.id, event)} />
        </label>
      ) : null}

      <label>
        Kategorija
        <select name="category_id" value={row.category_id} onChange={(event) => onChange(row.id, event)}>
          <option value="">Odaberite kategoriju</option>
          {categories.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {item.label}
            </option>
          ))}
          <option value={OTHER_OPTION_VALUE}>Ostalo...</option>
        </select>
      </label>

      {row.category_id === OTHER_OPTION_VALUE ? (
        <label>
          Unesite novu kategoriju
          <input type="text" name="new_category_label" value={row.new_category_label} onChange={(event) => onChange(row.id, event)} />
        </label>
      ) : null}

      <label>
        Količina
        <input type="number" min="0.01" step="0.01" name="count_in" value={row.count_in} onChange={(event) => onChange(row.id, event)} />
      </label>

      <label>
        Prosječna težina
        <input type="number" min="0.0001" step="0.0001" name="weight_avg_kg" value={row.weight_avg_kg} onChange={(event) => onChange(row.id, event)} />
      </label>

      <label>
        Ukupna težina
        <input type="number" min="0.0001" step="0.0001" name="weight_total_kg" value={row.weight_total_kg} onChange={(event) => onChange(row.id, event)} />
      </label>

      {showDelete ? (
        <button type="button" onClick={() => onDelete(row.id)} disabled={disabled}>
          Obriši
        </button>
      ) : null}
    </fieldset>
  );
}

export { OTHER_OPTION_VALUE };
