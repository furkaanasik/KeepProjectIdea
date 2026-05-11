const IDEA_PLACEHOLDER = '{user_project_idea}';
const ANALYSIS_PLACEHOLDER = '{analysis_json}';
const SUGGESTIONS_PLACEHOLDER = '{selected_suggestions_json}';

const VIABILITY_PROMPT_TEMPLATE = `Sen deneyimli bir startup danışmanı ve VC analistisin. Bir proje fikrinin mevcut analizi ve projeye eklenmesine karar verilen somut geliştirme önerileri verildi. Bu öneriler hayata geçirildiğinde projenin viability skorunu yeniden değerlendir.

PROJE FİKRİ: ${IDEA_PLACEHOLDER}

MEVCUT ANALİZ:
${ANALYSIS_PLACEHOLDER}

EKLENEN GELİŞTİRME ÖNERİLERİ:
${SUGGESTIONS_PLACEHOLDER}

GÖREVİN:
Yukarıdaki geliştirme önerileri uygulandığında projenin piyasa değerini, teknik fizibiliteyi ve büyüme potansiyelini göz önünde bulundurarak yeni bir Viability skoru belirle. Önerilerin projeye katkısını açıkça değerlendir.

SADECE aşağıdaki JSON formatında yanıt ver:
{
  "viability": {
    "score": <0-100 arası tam sayı>,
    "status": "<Türkçe kısa durum: 'Yapmaya Değer', 'Potansiyelli', 'Riskli', 'Yapma' vb.>",
    "reasoning": "<Seçilen önerilerin projeye katkısını açıklayan 1-2 cümle>"
  }
}

KRİTİK KURAL: Sadece JSON döndür. Başka açıklama, yorum veya metin ekleme.`;

export function buildViabilityPrompt(
  idea: string,
  analysis: unknown,
  selectedSuggestions: unknown,
): string {
  return VIABILITY_PROMPT_TEMPLATE
    .replace(IDEA_PLACEHOLDER, idea)
    .replace(ANALYSIS_PLACEHOLDER, JSON.stringify(analysis, null, 2))
    .replace(SUGGESTIONS_PLACEHOLDER, JSON.stringify(selectedSuggestions, null, 2));
}
