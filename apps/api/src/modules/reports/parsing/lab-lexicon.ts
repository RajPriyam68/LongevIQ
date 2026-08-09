export interface LabTest {
  name: string;
  aliases: string[];
  defaultUnit: string | null;
}

/**
 * Canonical lab panel with aliases tuned for OCR noise (e.g. "A1c" frequently
 * reads back as "Alc"). Matching is case-insensitive and word-boundary based.
 */
export const LAB_TESTS: LabTest[] = [
  {
    name: 'Glucose',
    aliases: ['glucose', 'fasting glucose', 'plasma glucose', 'blood glucose', 'fbg'],
    defaultUnit: 'mg/dL',
  },
  {
    name: 'Hemoglobin A1c',
    aliases: ['hemoglobin a1c', 'hba1c', 'a1c', 'alc', 'glycated hemoglobin', 'glycohemoglobin'],
    defaultUnit: '%',
  },
  {
    name: 'Total Cholesterol',
    aliases: ['total cholesterol', 'cholesterol total', 'cholesterol'],
    defaultUnit: 'mg/dL',
  },
  {
    name: 'HDL Cholesterol',
    aliases: ['hdl cholesterol', 'hdl', 'high density lipoprotein'],
    defaultUnit: 'mg/dL',
  },
  {
    name: 'LDL Cholesterol',
    aliases: ['ldl cholesterol', 'ldl', 'low density lipoprotein'],
    defaultUnit: 'mg/dL',
  },
  {
    name: 'Triglycerides',
    aliases: ['triglycerides', 'triglyceride', 'trig'],
    defaultUnit: 'mg/dL',
  },
  {
    name: 'Creatinine',
    aliases: ['creatinine', 'serum creatinine', 'creatinine serum'],
    defaultUnit: 'mg/dL',
  },
  {
    name: 'BUN',
    aliases: ['bun', 'blood urea nitrogen', 'urea nitrogen'],
    defaultUnit: 'mg/dL',
  },
  {
    name: 'Uric Acid',
    aliases: ['uric acid', 'urate'],
    defaultUnit: 'mg/dL',
  },
  {
    name: 'White Blood Cells',
    aliases: ['white blood cells', 'wbc', 'leukocytes', 'white cell count'],
    defaultUnit: 'x10^3/uL',
  },
  {
    name: 'Red Blood Cells',
    aliases: ['red blood cells', 'rbc', 'erythrocytes', 'red cell count'],
    defaultUnit: 'x10^6/uL',
  },
  {
    name: 'Hemoglobin',
    aliases: ['hemoglobin', 'haemoglobin', 'hgb', 'hb'],
    defaultUnit: 'g/dL',
  },
  {
    name: 'Hematocrit',
    aliases: ['hematocrit', 'haematocrit', 'hct'],
    defaultUnit: '%',
  },
  {
    name: 'Platelets',
    aliases: ['platelets', 'platelet count', 'plt', 'thrombocytes'],
    defaultUnit: 'x10^3/uL',
  },
  {
    name: 'ALT',
    aliases: ['alt', 'alanine aminotransferase', 'alanine transaminase'],
    defaultUnit: 'U/L',
  },
  {
    name: 'AST',
    aliases: ['ast', 'aspartate aminotransferase', 'aspartate transaminase'],
    defaultUnit: 'U/L',
  },
  {
    name: 'ALP',
    aliases: ['alp', 'alkaline phosphatase'],
    defaultUnit: 'U/L',
  },
  {
    name: 'Total Bilirubin',
    aliases: ['total bilirubin', 'bilirubin total', 'bilirubin'],
    defaultUnit: 'mg/dL',
  },
  {
    name: 'Albumin',
    aliases: ['albumin', 'serum albumin'],
    defaultUnit: 'g/dL',
  },
  {
    name: 'Total Protein',
    aliases: ['total protein', 'protein total', 'serum protein'],
    defaultUnit: 'g/dL',
  },
  {
    name: 'Potassium',
    aliases: ['potassium', 'k+', 'kalium'],
    defaultUnit: 'mmol/L',
  },
  {
    name: 'Sodium',
    aliases: ['sodium', 'na+', 'natrium'],
    defaultUnit: 'mmol/L',
  },
  {
    name: 'Chloride',
    aliases: ['chloride', 'cl-'],
    defaultUnit: 'mmol/L',
  },
  {
    name: 'Calcium',
    aliases: ['calcium', 'serum calcium', 'ca'],
    defaultUnit: 'mg/dL',
  },
  {
    name: 'Vitamin D',
    aliases: ['vitamin d', '25-hydroxy vitamin d', '25 oh vitamin d', '25-hydroxyvitamin d'],
    defaultUnit: 'ng/mL',
  },
  {
    name: 'TSH',
    aliases: ['tsh', 'thyroid stimulating hormone', 'thyrotropin'],
    defaultUnit: 'mIU/L',
  },
  {
    name: 'Free T4',
    aliases: ['free t4', 'thyroxine free', 'ft4'],
    defaultUnit: 'ng/dL',
  },
  {
    name: 'Iron',
    aliases: ['iron', 'serum iron'],
    defaultUnit: 'mcg/dL',
  },
  {
    name: 'Ferritin',
    aliases: ['ferritin', 'serum ferritin'],
    defaultUnit: 'ng/mL',
  },
  {
    name: 'C-Reactive Protein',
    aliases: ['c-reactive protein', 'crp', 'high sensitivity crp', 'hs-crp'],
    defaultUnit: 'mg/L',
  },
];

export const UNIT_ALIASES: Record<string, string> = {
  'mg/dl': 'mg/dL',
  'mg %': 'mg/dL',
  'mmol/l': 'mmol/L',
  'mmo/l': 'mmol/L',
  'g/dl': 'g/dL',
  'gm/dl': 'g/dL',
  'ng/ml': 'ng/mL',
  'ng/dl': 'ng/dL',
  'pg/ml': 'pg/mL',
  'mcg/dl': 'mcg/dL',
  'ug/dl': 'mcg/dL',
  'mcg/ml': 'mcg/mL',
  'ug/ml': 'mcg/mL',
  'u/l': 'U/L',
  'iu/l': 'IU/L',
  'miu/l': 'mIU/L',
  'miu/ml': 'mIU/L',
  'uiu/ml': 'mIU/L',
  'mc u/ml': 'mIU/L',
  'u u/ml': 'mIU/L',
  '10^9/l': 'x10^9/L',
  'x10^9/l': 'x10^9/L',
  '10^3/ul': 'x10^3/uL',
  'x10^3/ul': 'x10^3/uL',
  '10 3/ul': 'x10^3/uL',
  'x 10 3/ul': 'x10^3/uL',
  '10^6/ul': 'x10^6/uL',
  'x10^6/ul': 'x10^6/uL',
  'mg/l': 'mg/L',
};
