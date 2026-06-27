// lib/dashboard/ordinal-sort.ts

// Known ordinal column patterns and their sort order
const ORDINAL_ORDERS: Record<string, string[]> = {
  activity_level: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Athlete'],
  activity: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Athlete'],
  education: ['High School', 'Associate', 'Bachelor', "Bachelor's", 'Master', "Master's", 'PhD', 'Doctorate'],
  education_level: ['High School', 'Associate', 'Bachelor', "Bachelor's", 'Master', "Master's", 'PhD', 'Doctorate'],
  income: ['Low', 'Lower Middle', 'Middle', 'Upper Middle', 'High'],
  income_bracket: ['Low', 'Lower Middle', 'Middle', 'Upper Middle', 'High'],
  age_group: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
  severity: ['Low', 'Medium', 'High', 'Critical'],
  severity_level: ['Low', 'Medium', 'High', 'Critical'],
  priority: ['Low', 'Medium', 'High', 'Critical', 'Urgent'],
  satisfaction: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'],
  rating: ['1', '2', '3', '4', '5'],
  size: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  experience: ['Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Principal', 'Director'],
  experience_level: ['Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Principal', 'Director'],
  quarter: ['Q1', 'Q2', 'Q3', 'Q4'],
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  health_status: ['Underweight', 'Healthy', 'Overweight', 'Obese'],
  bmi_category: ['Underweight', 'Normal', 'Overweight', 'Obese'],
  risk_level: ['Low', 'Medium', 'High', 'Critical'],
  automation_level: ['Low', 'Medium', 'High'],
}

export function getOrdinalOrder(columnName: string): string[] | null {
  const col = columnName.toLowerCase()
  // Direct match first
  if (ORDINAL_ORDERS[col]) return ORDINAL_ORDERS[col]
  // Partial match — check if column name contains a known key
  for (const key of Object.keys(ORDINAL_ORDERS)) {
    if (col.includes(key)) return ORDINAL_ORDERS[key]
  }
  return null
}

export function sortByOrdinal<T extends { name: string }>(
  data: T[],
  columnName: string
): T[] {
  const order = getOrdinalOrder(columnName)
  if (!order) return data // no known order — keep value sort

  const orderMap = new Map(order.map((v, i) => [v.toLowerCase(), i]))

  return [...data].sort((a, b) => {
    const ai = orderMap.get(a.name.toLowerCase()) ?? 999
    const bi = orderMap.get(b.name.toLowerCase()) ?? 999
    return ai - bi
  })
}
