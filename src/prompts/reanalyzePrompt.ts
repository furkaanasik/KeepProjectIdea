const IDEA_PLACEHOLDER = '{user_project_idea}';
const ANALYSIS_PLACEHOLDER = '{analysis_json}';
const SUGGESTIONS_PLACEHOLDER = '{selected_suggestions_json}';

const REANALYZE_PROMPT_TEMPLATE = `Sen kıdemli bir Risk Sermayesi Uzmanı ve Pazar Stratejistsin. Bir proje fikrinin mevcut analizi ve projeye eklenmesine karar verilen somut geliştirme önerileri verildi. Bu öneriler hayata geçirildiğinde projeyi BAŞTAN analiz et — tüm alanları öneriler ışığında güncelle.

PROJE FİKRİ: ${IDEA_PLACEHOLDER}

MEVCUT ANALİZ:
${ANALYSIS_PLACEHOLDER}

EKLENEN GELİŞTİRME ÖNERİLERİ:
${SUGGESTIONS_PLACEHOLDER}

GÖREVİN:
Seçilen geliştirme önerileri uygulandığında projenin tüm boyutlarını yeniden değerlendir. Orijinal analizi referans al ama önerilerin değiştirdiği her alanı gerçekçi biçimde güncelle. Mevcut rakipler ve pazar gerçekleri değişmez; yalnızca projenin konumlanması, vc skorları, viability ve diğer yorumsal alanlar güncellenebilir.

SADECE aşağıdaki JSON formatında yanıt ver (mevcut analizle aynı yapı):
{
  "project_summary": "Geliştirme önerileri dahil edilmiş projenin kısa ve öz yeni tanımı",
  "competitors": [
    { "name": "Rakip Adı (gerçek şirket)", "key_features": "Öne çıkan özellikleri", "weakness": "Kullanıcıların bulamadığı eksiklik" }
  ],
  "market_analysis": {
    "trends": "Pazar trendleri (önerilerle güçlendirilmiş bağlam dahil)",
    "target_audience": "Önerilerin hedef kitleye katkısı dahil güncel tanım"
  },
  "viability": {
    "score": 0,
    "status": "Türkçe kısa durum",
    "reasoning": "Önerilerin projeye katkısı ve yeni viability gerekçesi"
  },
  "differentiation_points": [
    "Öneriler dahil farklılaştırıcı özellik 1",
    "Öneriler dahil farklılaştırıcı özellik 2",
    "Öneriler dahil farklılaştırıcı özellik 3"
  ],
  "vc_scores": {
    "market_fit": 0,
    "feasibility": 0,
    "moat": 0,
    "scalability": 0
  },
  "pain_points": [
    "Spesifik acı nokta 1",
    "Spesifik acı nokta 2",
    "Spesifik acı nokta 3"
  ],
  "revenue_model": "Öneriler ışığında güncellenmiş gelir modeli ve monetizasyon stratejisi (en az 50 karakter)",
  "decision": "KEEP veya DROP",
  "master_prompt": "Geliştirme önerileri entegre edilmiş, güncellenmiş sistem promptu (en az 200 karakter)"
}

KRİTİK KURALLAR:
- Sadece JSON döndür. Başka açıklama veya yorum ekleme.
- "competitors" içindeki her nesne YALNIZCA "name", "key_features" ve "weakness" içermeli.
- Üst seviyede tam olarak 10 alan olmalı: project_summary, competitors, market_analysis, viability, differentiation_points, vc_scores, pain_points, revenue_model, decision, master_prompt.
- vc_scores 1-10 arası tam sayı olmalı; moat için gerçekçi ol.
- decision: vc_scores ortalaması >= 7 ise KEEP, değilse DROP.`;

export function buildReanalyzePrompt(
  idea: string,
  analysis: unknown,
  selectedSuggestions: unknown,
): string {
  return REANALYZE_PROMPT_TEMPLATE
    .replace(IDEA_PLACEHOLDER, idea)
    .replace(ANALYSIS_PLACEHOLDER, JSON.stringify(analysis, null, 2))
    .replace(SUGGESTIONS_PLACEHOLDER, JSON.stringify(selectedSuggestions, null, 2));
}
