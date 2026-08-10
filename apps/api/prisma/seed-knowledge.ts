import { PrismaClient } from '@prisma/client';
import type { KnowledgeCategory, KnowledgeStatus } from '@prisma/client';
import { chunkMarkdown } from '../src/modules/knowledge/chunking/text-chunker.js';

const prisma = new PrismaClient();

interface SeedArticle {
  slug: string;
  title: string;
  summary: string;
  category: KnowledgeCategory;
  source: string;
  status: KnowledgeStatus;
  language: string;
  content: string;
}

const articles: SeedArticle[] = [
  {
    slug: 'understanding-blood-pressure',
    title: 'Understanding Blood Pressure',
    summary:
      'How blood pressure is measured, what systolic and diastolic values mean, and how to interpret the categories used by clinicians.',
    category: 'METRICS',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## What blood pressure measures

Blood pressure is the force that circulating blood exerts on the walls of the arteries. It is reported as two numbers: systolic pressure (the top number) measures the force when the heart contracts, while diastolic pressure (the bottom number) measures the force when the heart relaxes between beats. Both are measured in millimeters of mercury (mmHg).

## Categories used in clinical practice

A normal reading is below 120/80 mmHg. Elevated blood pressure starts at 120-129 systolic with a diastolic below 80. Stage 1 hypertension is 130-139 systolic or 80-89 diastolic, and stage 2 hypertension is 140/90 or higher. A hypertensive crisis is a reading above 180/120 that requires immediate medical attention.

## How to get a reliable measurement

Sit quietly for five minutes before measuring, keep both feet flat on the floor, and support the arm at heart level. Avoid caffeine, exercise, and smoking for 30 minutes beforehand. A single high reading does not confirm hypertension; clinicians typically average readings taken on several occasions.

## Why long-term control matters

Sustained hypertension is a major risk factor for heart attack, stroke, kidney disease, and vision loss. Even a modest reduction in blood pressure meaningfully lowers cardiovascular risk. Lifestyle measures such as reducing sodium, maintaining a healthy weight, regular aerobic activity, and limiting alcohol are first-line interventions alongside any treatment your clinician prescribes.`,
  },
  {
    slug: 'resting-heart-rate',
    title: 'Resting Heart Rate and Fitness',
    summary:
      'What a resting heart rate is, what is considered normal, and how it can change with physical fitness and training.',
    category: 'METRICS',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## What is a resting heart rate

Your resting heart rate is the number of times your heart beats per minute while you are at rest. The most reliable way to measure it is first thing in the morning, before you get out of bed, on a day when you are well rested.

## What is considered normal

For most adults the normal range is 60 to 100 beats per minute. Well-trained athletes frequently sit at 40 to 60 beats per minute because a stronger heart pumps more blood with each beat. A resting heart rate consistently above 100, or below 50 with symptoms such as dizziness, should be discussed with a clinician.

## Factors that influence the rate

Fitness level, stress, sleep quality, hydration, caffeine, alcohol, and some medications all move your resting heart rate. Fever and illness raise it, which is why a noticeably higher morning reading can be an early sign that you are coming down with something.

## Tracking your trends

Single readings are not very informative; the trend over weeks matters more. A gradually declining resting heart rate over months of consistent training is a common sign of improving cardiovascular fitness. Record your readings in a health journal or app so you and your clinician can review the trajectory together.`,
  },
  {
    slug: 'body-mass-index',
    title: 'Body Mass Index: Uses and Limits',
    summary:
      'How BMI is calculated, what the categories mean, and why it is an incomplete picture of metabolic health on its own.',
    category: 'METRICS',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## How BMI is calculated

Body mass index (BMI) is your weight in kilograms divided by the square of your height in meters. A BMI under 18.5 is considered underweight, 18.5 to 24.9 is normal weight, 25 to 29.9 is overweight, and 30 or above is classified as obesity.

## What BMI can and cannot tell you

BMI is a convenient screening tool, but it does not distinguish fat from muscle. A muscular person can have a high BMI with very low body fat, and a person with normal BMI can still carry excess abdominal fat. It also does not capture where fat is distributed, which matters because visceral fat around the organs carries higher metabolic risk.

## Metrics that complement BMI

Waist circumference, waist-to-hip ratio, and body fat percentage provide a fuller picture. Metabolic markers such as blood pressure, fasting glucose, and lipids are arguably more important than the number on the scale. Many clinicians now evaluate weight-related risk using several of these measures together rather than BMI alone.

## Using BMI constructively

Treat BMI as a starting point for a conversation with your clinician, not a verdict. Weight changes are best interpreted alongside laboratory values, energy intake, physical activity, and how you feel. Focus on sustainable habits rather than chasing a target number.`,
  },
  {
    slug: 'blood-glucose-and-hba1c',
    title: 'Blood Glucose and HbA1c',
    summary:
      'The difference between fasting glucose and HbA1c, how each is measured, and what the diagnostic thresholds mean.',
    category: 'LABS',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## Two different views of glucose control

Fasting blood glucose reflects the concentration of sugar in your blood at a single moment, typically after at least eight hours without food. Hemoglobin A1c, or HbA1c, reflects the average glucose level over the previous two to three months by measuring how much sugar has attached to red blood cells.

## What the numbers mean

A normal fasting glucose is below 100 mg/dL. Values of 100 to 125 mg/dL indicate prediabetes, and a fasting glucose of 126 mg/dL or higher, confirmed on a second test, suggests diabetes. A normal HbA1c is below 5.7 percent, prediabetes ranges from 5.7 to 6.4 percent, and 6.5 percent or higher indicates diabetes.

## Why the two tests are both useful

Fasting glucose catches acute problems and is inexpensive, while HbA1c smooths out day-to-day variation and is less sensitive to what you ate the night before. Clinicians often use both, because someone with a normal fasting value can still have an elevated HbA1c, and vice versa.

## Factors that can skew results

Anemia, recent blood loss, pregnancy, and some hemoglobin variants can alter HbA1c readings. Illness and stress can temporarily raise fasting glucose. If a result does not match how you feel, ask your clinician whether repeat testing is warranted before drawing conclusions.`,
  },
  {
    slug: 'cholesterol-lipid-panel',
    title: 'Cholesterol and the Lipid Panel',
    summary:
      'How to read the standard lipid panel: LDL, HDL, triglycerides, and total cholesterol, plus what the targets are.',
    category: 'LABS',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## What a lipid panel measures

A standard lipid panel reports total cholesterol, LDL cholesterol (the carrier often called the bad cholesterol), HDL cholesterol (the good cholesterol), and triglycerides, a type of fat your body uses for energy. A fasting sample used to be required for triglycerides, though modern guidelines allow non-fasting draws in many cases.

## How to interpret the values

For most adults, total cholesterol below 200 mg/dL is desirable, LDL below 100 mg/dL is optimal, HDL above 60 mg/dL is protective, and triglycerides below 150 mg/dL are normal. These are general targets; your personal goals depend on age, family history, blood pressure, diabetes, and smoking status, so an individualized risk calculation matters more than any single number.

## The big picture: cardiovascular risk

Cholesterol does not act alone. Risk calculators combine lipids with blood pressure, age, and other factors to estimate ten-year cardiovascular risk. Someone with moderately elevated LDL but otherwise low risk may not need medication, while a person with the same LDL plus diabetes and high blood pressure often will.

## What improves your numbers

Replacing saturated and trans fats with unsaturated fats, increasing soluble fiber, staying physically active, and losing excess weight can lower LDL and raise HDL. Statins and other lipid-lowering therapies remain the most effective interventions for people at elevated risk, and they should be taken as prescribed.`,
  },
  {
    slug: 'vitamin-d',
    title: 'Vitamin D and Bone Health',
    summary:
      'Why vitamin D matters beyond bones, what a normal level looks like, and how to interpret deficiency testing.',
    category: 'LABS',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## What vitamin D does

Vitamin D helps the body absorb calcium and phosphorus, which are essential for building and maintaining strong bones. It also supports muscle function and immune regulation, and adequate levels are associated with lower fracture risk in older adults.

## How it is measured

The standard test measures 25-hydroxyvitamin D, or 25(OH)D, in blood. Most reference laboratories consider levels of 20 to 50 ng/mL sufficient, values of 12 to 20 ng/mL insufficient, and levels below 12 ng/mL deficient. Interpretation varies between laboratories, so always read the range printed on your report.

## Who is at risk of deficiency

People who spend little time in sunlight, have darker skin, are older, are obese, or follow a strict vegan diet are more likely to have low levels. Certain digestive conditions that impair fat absorption also raise the risk, because vitamin D is fat-soluble.

## Replenishing and maintaining levels

Moderate sun exposure, fatty fish, and fortified foods contribute to vitamin D, but supplements are often needed to correct a deficiency. If you supplement, check with your clinician about the right dose: very high doses taken long-term can cause toxicity. Retesting after several months of supplementation confirms whether the dose is adequate.`,
  },
  {
    slug: 'complete-blood-count',
    title: 'The Complete Blood Count',
    summary:
      'A plain-language guide to the components of a CBC: red cells, white cells, platelets, and hemoglobin.',
    category: 'LABS',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## Why the CBC is so common

The complete blood count (CBC) is one of the most frequently ordered tests because it gives a snapshot of the three main families of blood cells. It is used in routine checkups, to investigate fatigue or infection, and to monitor chronic conditions and treatments.

## Red blood cells and hemoglobin

Red blood cells carry oxygen via hemoglobin. Low hemoglobin indicates anemia, which can cause fatigue, weakness, and shortness of breath. Anemia has many causes, including iron deficiency, vitamin B12 deficiency, and chronic disease, so the CBC alone rarely identifies the reason.

## White blood cells

White blood cells defend against infection. A high count can signal infection, inflammation, or stress, while a low count can follow viral illness or certain medications. The differential breaks the white cell population into subtypes such as neutrophils and lymphocytes, which helps narrow down the cause.

## Platelets

Platelets help blood clot. Low platelets raise bleeding risk, while very high platelets can signal inflammation or other conditions. Mild, isolated abnormalities are common and often transient; your clinician interprets the pattern as a whole rather than each box in isolation.`,
  },
  {
    slug: 'thyroid-function',
    title: 'Thyroid Function Tests',
    summary:
      'What TSH, free T4, and free T3 measure, and how the feedback loop between the pituitary and thyroid works.',
    category: 'LABS',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## The thyroid feedback loop

The thyroid gland in your neck produces hormones that regulate your metabolism. Production is controlled by the pituitary gland, which releases thyroid-stimulating hormone (TSH). When thyroid hormone levels fall, TSH rises to push the gland harder; when levels rise, TSH falls. This inverse relationship is why TSH is the most sensitive first-line screening test.

## The three key measurements

TSH is the screening test, free T4 is the main hormone produced by the thyroid, and free T3 is the more active form converted from T4 in tissues. A high TSH with a low free T4 points to hypothyroidism, while a low TSH with a high free T4 suggests hyperthyroidism.

## Symptoms that prompt testing

Fatigue, weight change, feeling cold or hot, hair changes, and heart palpitations are common reasons to check thyroid function. Because symptoms overlap with many other conditions, thyroid testing is inexpensive and routinely used to rule thyroid problems in or out.

## What can interfere with results

Pregnancy, acute illness, certain medications such as biotin supplements and some heart drugs, and laboratory variation can all shift thyroid values. Confirmatory testing often repeats the panel or adds antibodies, such as anti-TPO, when autoimmune thyroid disease is suspected. Do not stop or start thyroid medication based on a single reading without discussing it with your clinician.`,
  },
  {
    slug: 'mediterranean-diet',
    title: 'The Mediterranean Diet',
    summary:
      'The core principles of the Mediterranean diet and the evidence behind its benefits for heart health and longevity.',
    category: 'NUTRITION',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## What the Mediterranean diet really is

The Mediterranean diet is a pattern of eating, not a rigid menu. It is built around vegetables, fruits, legumes, whole grains, nuts, and olive oil as the main sources of fat. Fish and poultry appear several times a week, dairy in moderation, and red meat and sweets only occasionally.

## Why olive oil is central

Extra-virgin olive oil is rich in monounsaturated fats and polyphenols, which support heart health. Replacing butter, lard, and other saturated fats with olive oil is one of the highest-impact single changes within this pattern. Nuts and seeds offer similar benefits.

## The evidence for benefits

Large observational studies and randomized trials link the Mediterranean pattern with lower rates of heart attack, stroke, and type 2 diabetes. It is consistently ranked among the most sustainable dietary patterns for long-term adherence, partly because it allows a wide variety of foods and flavors.

## Practical starting points

Add a serving of vegetables to one more meal a day, choose fish instead of red meat twice a week, use olive oil in place of butter, and keep nuts and fruit as your default snacks. Small, consistent changes matter more than perfectly following any single rule, and any dietary change should fit your budget, culture, and medical needs.`,
  },
  {
    slug: 'dietary-protein',
    title: 'How Much Protein Do You Need',
    summary:
      'Estimating your daily protein needs, when timing matters, and how needs change with age and activity.',
    category: 'NUTRITION',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## Baseline protein needs

The reference intake for a healthy sedentary adult is about 0.8 grams of protein per kilogram of body weight per day. For a 70 kilogram person that is roughly 56 grams, easily covered by two palm-sized servings of protein-rich food.

## Who needs more

Athletes building muscle typically aim for 1.2 to 2.0 grams per kilogram. Older adults have higher needs, around 1.2 to 1.5 grams per kilogram, because muscle loss with aging makes sufficient protein especially important. Recovery from illness, surgery, or injury also raises requirements temporarily.

## Quality and distribution

Protein quality depends on the amino acid profile; animal sources and soy contain all essential amino acids, while plant sources are usually complemented by combining grains and legumes across the day. Spreading intake across three or four meals stimulates muscle synthesis more effectively than eating most protein in a single dinner.

## Practical guidance

A serving of cooked chicken breast, fish, or tofu provides roughly 25 to 30 grams of protein. Eggs, dairy, beans, lentils, and nuts add up quickly. If you have kidney disease, your clinician may recommend a specific protein target, so follow that advice rather than general guidelines.`,
  },
  {
    slug: 'hydration',
    title: 'Hydration and Daily Fluid Needs',
    summary:
      'How much fluid you actually need, how to recognize dehydration, and the best sources of hydration.',
    category: 'NUTRITION',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## The eight-glass rule and its limits

The familiar advice to drink eight glasses of water a day is a general guideline, not a precise requirement. Total daily fluid needs for adults are often estimated around 2.7 liters for women and 3.7 liters for men, but a large share of that comes from food and from other beverages.

## Your personal needs vary

Fluid requirements rise with heat, humidity, exercise, fever, and sweating, and fall in cooler sedentary periods. Breastfeeding, pregnancy, and some medical conditions change needs substantially. Thirst is a reasonable guide for most healthy people, though older adults may not feel thirsty until dehydration is already underway.

## Signs of dehydration

Dark urine, infrequent urination, headache, fatigue, dry mouth, and dizziness are common early signs. Severe dehydration, marked by confusion, rapid heartbeat, or fainting, requires prompt medical care. Urine color is a simple daily check: pale straw indicates adequate hydration.

## Choosing what to drink

Water is the default choice, while milk and some fruit contribute fluids plus nutrients. Sugary drinks and excessive caffeine add calories or disrupt sleep. For intense or prolonged exercise lasting over an hour, a drink containing electrolytes may help, but for everyday activity plain water is sufficient.`,
  },
  {
    slug: 'sleep-hygiene',
    title: 'Sleep Hygiene: Habits That Improve Sleep',
    summary:
      'Practical sleep hygiene habits, how much sleep adults need, and when to seek help for persistent insomnia.',
    category: 'WELLNESS',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## How much sleep adults need

Most adults need seven to nine hours of sleep per night. Both short and chronically long sleep are associated with worse health outcomes. Quality matters as much as quantity: feeling rested during the day is a practical sign that your sleep is sufficient.

## Build a consistent schedule

Going to bed and waking at roughly the same time every day, including weekends, anchors your circadian rhythm. Morning light exposure within an hour of waking strengthens that rhythm. A consistent schedule is one of the most effective single interventions for better sleep.

## Wind down before bed

Create a relaxing pre-sleep routine that starts about 30 to 60 minutes before bed: dim the lights, put screens away, and do something calm such as reading or gentle stretching. Screens emit blue light that suppresses melatonin, so the bedroom should be a screen-free zone whenever possible.

## The bedroom environment

Keep the room cool, dark, and quiet. A comfortable mattress and pillows matter. Avoid caffeine in the afternoon and evening, and limit alcohol, which fragments sleep even when it helps you fall asleep faster.

## When to seek help

If poor sleep lasts longer than a month despite good habits, or you snore loudly with pauses in breathing, talk to your clinician. Sleep apnea, restless legs, and mood disorders are common, treatable causes of chronic insomnia. Sleeping pills are a short-term tool, not a long-term solution.`,
  },
  {
    slug: 'stress-management',
    title: 'Managing Stress for Better Health',
    summary:
      'How chronic stress affects the body, and evidence-based techniques for keeping stress in check.',
    category: 'WELLNESS',
    source: 'LongevIQ Editorial',
    status: 'PUBLISHED',
    language: 'english',
    content: `## How stress affects the body

Stress triggers a cascade of hormones, including adrenaline and cortisol. In short bursts this response is protective, but chronic activation takes a toll: it can raise blood pressure, disrupt sleep, impair digestion, and contribute to anxiety and depression. Stress is also linked to inflammation and faster biological aging.

## The role of perception and control

Whether an event feels stressful depends largely on how you appraise it and whether you feel you have resources to cope. This is why the same workload can be energizing for one person and overwhelming for another. Building a sense of control and predictability reduces the physiological cost of stress.

## Techniques with real evidence

Breathing exercises, such as slow exhalation breathing for a few minutes, activate the parasympathetic nervous system. Physical activity burns off stress hormones and improves mood. Mindfulness practice, even ten minutes a day, is linked to lower cortisol and better emotional regulation. Social connection buffers stress more than most people realize.

## When it is time to get support

Persistent anxiety, hopelessness, or stress that interferes with work and relationships deserves professional attention. Therapies such as cognitive behavioral therapy are effective and teach skills you keep for life. Your primary care clinician can help you find the right support, and seeking help early is a strength, not a weakness.`,
  },
];

async function upsertArticle(article: SeedArticle): Promise<'created' | 'updated'> {
  const existing = await prisma.knowledgeDocument.findUnique({
    where: { slug: article.slug },
    select: { id: true },
  });

  const chunks = chunkMarkdown(article.content).map((chunk) => ({
    chunkIndex: chunk.index,
    title: chunk.title,
    content: chunk.content,
  }));

  if (!existing) {
    const document = await prisma.knowledgeDocument.create({
      data: {
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        category: article.category,
        source: article.source,
        status: article.status,
        language: article.language,
      },
    });
    await replaceChunks(document.id, chunks);
    return 'created';
  }

  await prisma.knowledgeDocument.update({
    where: { slug: article.slug },
    data: {
      title: article.title,
      summary: article.summary,
      category: article.category,
      source: article.source,
      status: article.status,
      language: article.language,
    },
  });
  await replaceChunks(existing.id, chunks);
  return 'updated';
}

async function replaceChunks(
  documentId: string,
  chunks: { chunkIndex: number; title: string | null; content: string }[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.knowledgeChunk.deleteMany({ where: { documentId } });
    await tx.knowledgeChunk.createMany({
      data: chunks.map((chunk) => ({
        documentId,
        chunkIndex: chunk.chunkIndex,
        title: chunk.title,
        content: chunk.content,
      })),
    });
    await tx.$executeRaw`
      UPDATE "KnowledgeChunk"
      SET "searchVector" = to_tsvector('english', content)
      WHERE "documentId" = ${documentId}
    `;
  });
}

async function main() {
  let created = 0;
  let updated = 0;
  for (const article of articles) {
    const outcome = await upsertArticle(article);
    if (outcome === 'created') created += 1;
    else updated += 1;
    console.log(`[knowledge] ${outcome}: ${article.slug}`);
  }
  console.log(
    `Seeded knowledge base: ${created} created, ${updated} updated, ${articles.length} total.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
