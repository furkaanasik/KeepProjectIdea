const IDEA_PLACEHOLDER = '{user_project_idea}';
const ANALYSIS_PLACEHOLDER = '{analysis_json}';

const DEVELOPER_PROMPT_TEMPLATE = `Sen deneyimli bir yazılım mimarı ve ürün geliştirme uzmanısın. Bir proje fikrinin stratejik analizi verildi. Bu analize dayanarak projeyi daha da geliştirmek için somut, uygulanabilir öneriler üret.

PROJE FİKRİ: ${IDEA_PLACEHOLDER}

MEVCUT STRATEJİK ANALİZ:
${ANALYSIS_PLACEHOLDER}

GÖREVİN:
Yukarıdaki analizi dikkate alarak 6-10 arası somut, uygulanabilir geliştirme önerisi üret. Her öneri şu kategorilerden birinde olmalı:
- feature: Kullanıcıya değer katacak yeni özellik veya fonksiyon
- tech_stack: Kullanılacak teknoloji, framework veya mimari karar
- mvp: Minimum viable product kapsamı ve önceliklendirmesi
- monetization: Gelirleştirme ve iş modeli önerisi
- growth: Büyüme ve kullanıcı edinimi stratejisi
- ux: Kullanıcı deneyimi ve arayüz iyileştirmesi

Öncelik belirleme kuralları:
- high: Rakiplere karşı kritik avantaj sağlar veya temel iş akışı için zorunludur
- medium: Önemli ama ilk sürüm olmadan da devam edilebilir
- low: Güzel olur, ikinci veya üçüncü iterasyona bırakılabilir

SADECE aşağıdaki JSON formatında yanıt ver:
{
  "suggestions": [
    {
      "id": "suggestion_1",
      "category": "feature",
      "title": "Kısa ve net başlık",
      "description": "Neden önemli ve nasıl uygulanır — somut ve ölçülebilir bilgi ver",
      "priority": "high"
    }
  ]
}

KRİTİK KURAL: Sadece JSON döndür. "suggestions" dizisi 6-10 eleman içermeli. Her elemanda tam olarak şu alanlar olmalı: id, category, title, description, priority. Başka açıklama, yorum veya metin ekleme.`;

export function buildDeveloperPrompt(idea: string, analysis: unknown): string {
  return DEVELOPER_PROMPT_TEMPLATE
    .replace(IDEA_PLACEHOLDER, idea)
    .replace(ANALYSIS_PLACEHOLDER, JSON.stringify(analysis, null, 2));
}
