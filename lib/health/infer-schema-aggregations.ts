import { generateJsonObject } from '@/lib/gemini-generate'
import type { DatasetSchema } from '@/lib/parsers/schema'

export async function inferSchemaAggregations(
  schema: DatasetSchema,
  columnStats: any,
  userId?: string
): Promise<Record<string, 'sum' | 'avg' | 'count'>> {
  const numericCols = schema.columns.filter((c) => c.type === 'number').map((c) => c.name)
  if (!numericCols.length) return {}

  const prompt = `You are a data analyst configuring defaults for a dataset.
For each of the following numeric columns, determine the logical default aggregation method when grouped by a category or shown on a stat card.

Columns to classify: ${JSON.stringify(numericCols)}
Schema snippet: ${JSON.stringify(schema.columns.filter(c => c.type === 'number').map(c => ({ name: c.name, min: c.min, max: c.max })))}

RULES:
- Use "avg" for per-record metrics: scores, rates, prices, BMI, calories, temperatures, satisfaction, percentages, ratios, indexes, or any measurement per individual/row.
- Use "sum" ONLY for cumulative totals: total revenue, total quantity, total spend, total orders, new cases, total deaths — columns where summing across rows makes business sense.
- NEVER use "sum" on columns whose values are between 0 and 1.
- RULE OF THUMB: If the column represents something measured per person/item/record, use "avg". If summing all values together produces a meaningful business total, use "sum".

Return ONLY a valid JSON object where the keys are the exact column names, and the values are either "sum" or "avg".
Example: { "total_sales": "sum", "age": "avg" }`

  try {
    const { data } = await generateJsonObject(prompt, {
      feature: 'schema_aggregation',
      json: true,
      userId,
    })

    const result: Record<string, 'sum' | 'avg' | 'count'> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value === 'sum' || value === 'avg' || value === 'count') {
        result[key] = value
      }
    }
    return result
  } catch (err) {
    console.error('Failed to infer schema aggregations:', err)
    return {}
  }
}
