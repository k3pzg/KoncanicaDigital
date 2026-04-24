import { FISH_ENTRY_EVENT_TYPES, FISH_SOURCE_KINDS } from '../constants/fish.constants.js';

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function toPositiveNumberOrNull(value) {
  const parsed = toNumberOrNull(value);
  if (parsed === null) {
    return null;
  }

  return parsed > 0 ? parsed : NaN;
}

export function normalizeEntryPayload(payload) {
  const countTotal = Number(payload.count_total ?? payload.count_in);
  const weightAvg = toPositiveNumberOrNull(payload.weight_avg_kg);
  const weightTotalRaw = toPositiveNumberOrNull(payload.weight_total_kg);
  const fallbackWeightTotal = Number.isFinite(countTotal) && countTotal > 0 && Number.isFinite(weightAvg)
    ? countTotal * weightAvg
    : NaN;

  const weightTotal = Number.isFinite(weightTotalRaw) ? weightTotalRaw : fallbackWeightTotal;

  return {
    water_object_id: Number(payload.water_object_id),
    event_date: payload.event_date,
    event_type: payload.event_type || 'nasad',
    species_id: Number(payload.species_id),
    category_id: Number(payload.category_id),
    count_total: countTotal,
    weight_avg_kg: Number.isFinite(weightAvg)
      ? weightAvg
      : (Number.isFinite(weightTotal) && Number.isFinite(countTotal) && countTotal > 0 ? weightTotal / countTotal : null),
    weight_total_kg: weightTotal,
    source_kind: payload.source_kind || 'ostalo',
    source_water_object_id: toNumberOrNull(payload.source_water_object_id),
    source_label: payload.source_label?.trim() || 'Fish entry event (app form)',
    notes: payload.notes?.trim() || null
  };
}

export function validateEntryPayload(payload) {
  if (!Number.isInteger(payload.water_object_id) || payload.water_object_id <= 0) {
    return 'water_object_id is required';
  }
  if (!payload.event_date) {
    return 'event_date is required';
  }
  if (!FISH_ENTRY_EVENT_TYPES.includes(payload.event_type)) {
    return `event_type must be one of: ${FISH_ENTRY_EVENT_TYPES.join(', ')}`;
  }
  if (!Number.isInteger(payload.species_id) || payload.species_id <= 0) {
    return 'species_id is required';
  }
  if (!Number.isInteger(payload.category_id) || payload.category_id <= 0) {
    return 'category_id is required';
  }
  if (!Number.isFinite(payload.count_total) || payload.count_total <= 0) {
    return 'count_total must be greater than 0';
  }
  if (!Number.isFinite(payload.weight_total_kg) || payload.weight_total_kg <= 0) {
    return 'weight_total_kg must be greater than 0';
  }
  if (!FISH_SOURCE_KINDS.includes(payload.source_kind)) {
    return `source_kind must be one of: ${FISH_SOURCE_KINDS.join(', ')}`;
  }

  if (payload.source_kind === 'interni_objekt' && (!Number.isFinite(payload.source_water_object_id) || payload.source_water_object_id <= 0)) {
    return 'source_water_object_id is required when source_kind is interni_objekt';
  }

  return null;
}

export function normalizeControlPayload(payload) {
  const lines = Array.isArray(payload.lines) ? payload.lines : [];

  return {
    water_object_id: Number(payload.water_object_id),
    control_date: payload.control_date,
    sample_area_m2: toNumberOrNull(payload.sample_area_m2),
    estimated_total_area_m2: toNumberOrNull(payload.estimated_total_area_m2),
    notes: payload.notes?.trim() || null,
    lines: lines.map((line) => ({
      species_id: Number(line.species_id),
      sample_count: Number(line.sample_count),
      sample_weight_total_kg: toNumberOrNull(line.sample_weight_total_kg),
      sample_weight_avg_kg: toNumberOrNull(line.sample_weight_avg_kg),
      estimated_count_total: Number(line.estimated_count_total),
      estimated_weight_total_kg: Number(line.estimated_weight_total_kg),
      notes: line.notes?.trim() || null
    }))
  };
}

export function validateControlPayload(payload) {
  if (!Number.isInteger(payload.water_object_id) || payload.water_object_id <= 0) {
    return 'water_object_id is required';
  }
  if (!payload.control_date) {
    return 'control_date is required';
  }
  if (!payload.lines.length) {
    return 'at least one control line is required';
  }

  for (const [index, line] of payload.lines.entries()) {
    if (!Number.isInteger(line.species_id) || line.species_id <= 0) {
      return `lines[${index}].species_id is required`;
    }
    if (!Number.isFinite(line.sample_count) || line.sample_count <= 0) {
      return `lines[${index}].sample_count must be greater than 0`;
    }
    if (!Number.isFinite(line.sample_weight_avg_kg) || line.sample_weight_avg_kg <= 0) {
      return `lines[${index}].sample_weight_avg_kg must be greater than 0`;
    }
    if (!Number.isFinite(line.estimated_count_total) || line.estimated_count_total <= 0) {
      return `lines[${index}].estimated_count_total must be greater than 0`;
    }
    if (!Number.isFinite(line.estimated_weight_total_kg) || line.estimated_weight_total_kg <= 0) {
      return `lines[${index}].estimated_weight_total_kg must be greater than 0`;
    }
  }

  return null;
}
