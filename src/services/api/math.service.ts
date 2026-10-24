import apiClient from "./client";

/** Office maths (OMML) for each LaTeX formula, in order; null where the converter cannot express one. */
export async function latexToOmml(tex: string[]): Promise<(string | null)[]> {
  if (tex.length === 0) return [];
  const response = await apiClient.post<{ omml: (string | null)[] }>("/math/omml", { tex });
  return response.data.omml;
}
