import type { Subject } from '@/types'

export interface TopicEntry { subtopic: string; topics: string[] }
export interface SubjectData {
  label: string; icon: string; color: string; bg: string; weight: number
  subtopics: TopicEntry[]
}

export const UPCAT_TOPICS: Record<Subject, SubjectData> = {
  Math: {
    label: 'Mathematics', icon: '📐', color: '#1D4ED8', bg: '#EFF6FF', weight: 0.20,
    subtopics: [
      { subtopic: 'Algebra', topics: [
        'Linear Equations & Inequalities','Systems of Linear Equations','Quadratic Equations & the Discriminant',
        'Polynomial Operations & Division','Factoring: GCF, Difference of Squares, Trinomials',
        'Rational Expressions & Equations','Radical Expressions & Equations','Exponential Equations',
        'Logarithmic Equations & Properties','Absolute Value Equations & Inequalities',
        'Arithmetic Sequences & Series','Geometric Sequences & Series',
      ]},
      { subtopic: 'Geometry', topics: [
        'Properties of Lines, Angles & Transversals','Triangle Congruence (SSS, SAS, ASA, AAS, HL)',
        'Triangle Similarity (AA, SSS, SAS)','Pythagorean Theorem & Converse',
        'Special Right Triangles (30-60-90, 45-45-90)','Quadrilaterals: Properties & Classification',
        'Polygons: Interior & Exterior Angles','Circles: Chords, Arcs, Sectors, Tangents',
        'Inscribed & Central Angles','Area & Perimeter of Plane Figures','Surface Area & Volume of Solids',
        'Geometric Proofs & Postulates','Transformations: Reflection, Rotation, Translation, Dilation',
      ]},
      { subtopic: 'Trigonometry', topics: [
        'Right Triangle Trigonometry (SOH-CAH-TOA)','Trigonometric Functions on the Unit Circle',
        'Reference Angles & Coterminal Angles','Inverse Trigonometric Functions',
        'Fundamental Trigonometric Identities','Sum & Difference Formulas','Double Angle Formulas',
        'Law of Sines','Law of Cosines','Angle of Elevation & Depression',
        'Radian & Degree Measure Conversion','Graphs of Sine, Cosine & Tangent',
      ]},
      { subtopic: 'Statistics & Probability', topics: [
        'Measures of Central Tendency (Mean, Median, Mode)','Measures of Dispersion (Range, Variance, SD)',
        'Frequency Distribution Tables & Histograms','Stem-and-Leaf Plots & Box Plots',
        'Scatter Plots, Correlation & Line of Best Fit','Basic Probability Rules',
        'Conditional Probability & Independence','Permutations','Combinations',
        'Fundamental Counting Principle','Binomial Probability','Normal Distribution & Z-scores',
      ]},
      { subtopic: 'Number Theory', topics: [
        'Divisibility Rules','Prime Factorization','GCF & LCM','Fractions, Decimals & Percentages',
        'Ratio & Proportion','Direct & Inverse Variation','Integers & Order of Operations',
        'Scientific Notation','Estimation & Approximation','Number Patterns & Problem Solving',
      ]},
      { subtopic: 'Word Problems', topics: [
        'Age Problems','Mixture Problems','Work & Rate Problems','Distance-Rate-Time Problems',
        'Coin & Investment Problems','Percent Increase & Decrease','Markup & Markdown',
        'Number Relationship Problems',
      ]},
      { subtopic: 'Functions & Analytic Geometry', topics: [
        'Domain & Range of Functions','Function Notation & Evaluation','Composite & Inverse Functions',
        'Linear Functions & Slope-Intercept Form','Parallel & Perpendicular Lines',
        'Distance & Midpoint Formula','Conic Sections: Circles','Conic Sections: Parabolas',
        'Conic Sections: Ellipses','Conic Sections: Hyperbolas','Piecewise Functions',
        'Exponential & Logarithmic Functions',
      ]},
    ],
  },
  Science: {
    label: 'Science', icon: '🔬', color: '#15803D', bg: '#F0FDF4', weight: 0.20,
    subtopics: [
      { subtopic: 'Cell Biology', topics: [
        'Cell Theory & History','Prokaryotic vs Eukaryotic Cells','Cell Organelles & Their Functions',
        'Cell Membrane Structure','Passive Transport: Diffusion & Osmosis','Active Transport & Endocytosis',
        'Cell Wall & Turgor Pressure','Cell Cycle: Mitosis & Cytokinesis','Meiosis & Genetic Recombination',
        'Photosynthesis: Light & Calvin Cycle','Cellular Respiration','Fermentation: Aerobic vs Anaerobic',
        'Enzymes: Function & Inhibitors',
      ]},
      { subtopic: 'Genetics & Molecular Biology', topics: [
        'DNA Structure: Double Helix','DNA Replication','RNA Types','Transcription','Translation',
        'Genetic Code & Codons','Mendelian Genetics','Monohybrid & Dihybrid Crosses','Punnett Squares',
        'Codominance & Incomplete Dominance','Sex-Linked Traits','Gene Mutations','Chromosomal Mutations',
        'Genetic Disorders','Karyotyping & Chromosomes',
      ]},
      { subtopic: 'Ecology & Evolution', topics: [
        'Levels of Organization','Food Chains & Food Webs','Energy Flow & Trophic Levels',
        'Biogeochemical Cycles','Philippine Ecosystems','Population Growth Models','Carrying Capacity',
        'Symbiosis','Ecological Succession','Natural Selection','Darwin\'s Theory of Evolution',
        'Evidence for Evolution','Speciation','Taxonomy & Classification',
      ]},
      { subtopic: 'Human Biology', topics: [
        'Digestive System','Circulatory System','Blood Types & ABO System','Respiratory System',
        'Nervous System','Endocrine System','Immune System','Musculoskeletal System',
        'Excretory System','Reproductive System','Integumentary System',
      ]},
      { subtopic: 'Atomic Structure & Periodic Table', topics: [
        'Atomic Theory History','Subatomic Particles','Atomic Number & Isotopes','Electron Configuration',
        'Periodic Table Organization','Periodic Trends','Metal/Nonmetal/Metalloid Properties',
        'Radioactivity & Decay Types','Half-life & Nuclear Equations',
      ]},
      { subtopic: 'Chemical Bonding & Reactions', topics: [
        'Ionic Bonding','Covalent Bonding','Lewis Dot Structures','VSEPR Theory','Metallic Bonding',
        'Intermolecular Forces','Naming Compounds','Types of Reactions','Balancing Equations',
        'Redox Reactions','Acids & Bases','pH Scale & Neutralization','Reaction Rates',
        'Chemical Equilibrium',
      ]},
      { subtopic: 'Stoichiometry & Matter', topics: [
        'Mole Concept','Molar Mass Calculations','Mole-to-Mole Stoichiometry','Mass-to-Mass Stoichiometry',
        'Limiting & Excess Reagent','Percent Yield','Empirical & Molecular Formula','States of Matter',
        'Gas Laws','Ideal Gas Law','Solutions & Molarity','Thermochemistry','Hess\'s Law',
      ]},
      { subtopic: 'Physics — Mechanics', topics: [
        'Kinematics','Uniformly Accelerated Motion','Free Fall & Projectile Motion',
        'Newton\'s Three Laws','Friction','Work, Energy & Power','Conservation of Energy',
        'Momentum & Impulse','Conservation of Momentum','Collisions','Circular Motion',
        'Universal Gravitation','Simple Machines','Simple Harmonic Motion',
      ]},
      { subtopic: 'Physics — Waves, Electricity & Optics', topics: [
        'Wave Properties','Sound Waves & Doppler Effect','Electromagnetic Spectrum',
        'Reflection & Mirrors','Refraction & Snell\'s Law','Lenses','Electric Charge & Coulomb\'s Law',
        'Electric Fields & Potential','Ohm\'s Law','Circuits: Series & Parallel','Electric Power',
        'Magnetic Fields','Electromagnetic Induction',
      ]},
      { subtopic: 'Earth & Environmental Science', topics: [
        'Earth\'s Layers','Plate Tectonics','Earthquakes & Seismic Waves','Philippine Fault System',
        'Volcanoes','Rock Cycle','Weathering & Erosion','Water Cycle','Atmosphere Layers',
        'Philippine Weather Patterns','Climate Change','Solar System','Moon Phases & Eclipses','Stars',
      ]},
    ],
  },
  Reading: {
    label: 'Reading Comprehension', icon: '📖', color: '#7C3AED', bg: '#F5F3FF', weight: 0.30,
    subtopics: [
      { subtopic: 'Main Idea & Structure', topics: [
        'Identifying the Main Idea','Main Idea vs Supporting Details','Best Title for a Passage',
        'Thesis Statement Recognition','Summarizing Paragraphs','Chronological Order Passages',
        'Problem-Solution Passages','Compare & Contrast Passages','Cause & Effect Passages',
        'Enumerative Structure Passages',
      ]},
      { subtopic: 'Inference & Critical Reading', topics: [
        'Making Inferences','Drawing Logical Conclusions','Implied Meaning','Fact vs Opinion',
        'Evaluating Evidence','Author\'s Argument','Logical Fallacies','Generalizations',
        'Predicting Outcomes','Identifying Missing Information',
      ]},
      { subtopic: 'Vocabulary in Context', topics: [
        'Meaning from Context (English)','Synonyms of Highlighted Words','Antonyms of Highlighted Words',
        'Connotation vs Denotation','Multiple Meaning Words','Formal vs Informal Register',
        'Prefixes, Suffixes & Root Words','Academic & Technical Vocabulary','Filipino Vocabulary in Mixed Passages',
      ]},
      { subtopic: 'Author\'s Purpose & Tone', topics: [
        'Author\'s Purpose','Tone Identification','Mood of a Passage','Point of View',
        'Detecting Bias','Rhetorical Devices','Propaganda Techniques','Irony, Sarcasm & Satire',
      ]},
      { subtopic: 'Literary Devices', topics: [
        'Simile & Metaphor','Personification','Hyperbole & Understatement','Alliteration & Onomatopoeia',
        'Symbolism & Allegory','Foreshadowing & Flashback','Imagery','Irony Types','Allusion',
        'Theme vs Moral',
      ]},
      { subtopic: 'Filipino Reading Comprehension', topics: [
        'Paghahanap ng Pangunahing Diwa','Paghihinuha at Konklusyon','Bokabularyo sa Konteksto (Filipino)',
        'Katotohanan vs Opinyon','Layunin ng May-akda','Tono at Damdamin ng Akda',
        'Mga Tayutay: Simile at Metapora','Mga Tayutay: Pagmamalabis','Maikling Kwentong Filipino',
        'Pagsusuri ng Tula','Dula-dulaan','Sawikain at Salawikain','Mga Salitang Hiram',
      ]},
    ],
  },
  Language: {
    label: 'Language Proficiency', icon: '✍️', color: '#0F766E', bg: '#F0FDFA', weight: 0.30,
    subtopics: [
      { subtopic: 'Grammar & Usage', topics: [
        'Subject-Verb Agreement (Basic)','Subject-Verb Agreement (Complex)','Verb Tenses: Simple',
        'Verb Tenses: Perfect','Verb Tenses: Continuous','Pronoun-Antecedent Agreement','Pronoun Case',
        'Adjectives vs Adverbs','Comparatives & Superlatives','Prepositions','Articles',
        'Conjunctions','Modal Verbs','Active vs Passive Voice','Gerunds & Infinitives',
        'Direct & Indirect Speech','Dangling & Misplaced Modifiers',
      ]},
      { subtopic: 'Sentence Structure', topics: [
        'Simple, Compound & Complex Sentences','Compound-Complex Sentences','Sentence Fragments',
        'Run-on Sentences','Parallel Structure','Sentence Combining','Sentence Reduction',
        'Relative Clauses','Adverbial Clauses','Noun Clauses','Conditional Sentences',
        'Inversions & Emphatic Structures','Cleft Sentences',
      ]},
      { subtopic: 'Analogy & Word Relationships', topics: [
        'Part-to-Whole Analogies','Cause-to-Effect Analogies','Synonym Analogies','Antonym Analogies',
        'Degree of Intensity Analogies','Function/Purpose Analogies','Worker-to-Tool Analogies',
        'Category & Member Analogies','Sequence/Order Analogies','Filipino Analogy',
      ]},
      { subtopic: 'Error Identification', topics: [
        'Subject-Verb Agreement Errors','Tense Errors','Pronoun Errors','Modifier Errors',
        'Parallelism Errors','Word Choice Errors','Punctuation Errors','Capitalization Errors',
        'Redundancy & Wordiness','Faulty Comparisons','No Error Identification',
      ]},
      { subtopic: 'Vocabulary', topics: [
        'Academic Word List','Commonly Confused Words','Commonly Misused Words',
        'Formal vs Informal Vocabulary','Latin & Greek Root Words','Common Prefixes','Common Suffixes',
        'Collocations & Fixed Expressions','Idiomatic Expressions','Filipino-English Code-Switching',
      ]},
      { subtopic: 'Sentence & Paragraph Completion', topics: [
        'Single Blank Completion','Double Blank Completion','Best Concluding Sentence',
        'Best Topic Sentence','Transition Words','Coherence & Cohesion','Best Supporting Sentence',
        'Sequencing Sentences',
      ]},
      { subtopic: 'Filipino Language Proficiency', topics: [
        'Wastong Gamit ng Panghalip','Wastong Gamit ng Pangatnig','Uri ng Pangungusap ayon sa Gamit',
        'Uri ng Pangungusap ayon sa Kayarian','Paggamit ng Bantas','Morphology ng Salita',
        'Salitang Ugat at Panlapi','Tamang Baybay','Magkasingkahulugan','Magkasalungat',
        'Pagtatambal ng Salita','Wastong Ayos ng Salita',
      ]},
    ],
  },
}

export const ALL_TOPICS_FLAT = Object.entries(UPCAT_TOPICS).flatMap(([subject, data]) =>
  data.subtopics.flatMap(st => st.topics.map(topic => ({ subject: subject as Subject, subtopic: st.subtopic, topic })))
)

export const SUBJECT_LIST: Subject[] = ['Math', 'Science', 'Reading', 'Language']
export const UPG_WEIGHTS: Record<Subject, number> = { Math: 0.20, Science: 0.20, Reading: 0.30, Language: 0.30 }

export function transmutePct(pct: number): number {
  if (pct >= 97) return 1.0; if (pct >= 94) return 1.25; if (pct >= 91) return 1.5
  if (pct >= 88) return 1.75; if (pct >= 85) return 2.0; if (pct >= 82) return 2.25
  if (pct >= 79) return 2.5; if (pct >= 76) return 2.75; if (pct >= 73) return 3.0
  if (pct >= 70) return 3.25; if (pct >= 67) return 3.5; if (pct >= 64) return 3.75
  if (pct >= 60) return 4.0; if (pct >= 55) return 4.25; if (pct >= 50) return 4.5
  return 5.0
}

export function upgDescription(upg: number): string {
  if (upg <= 1.5) return 'Excellent — UP Diliman competitive'
  if (upg <= 2.0) return 'Very Good — Strong UPCAT applicant'
  if (upg <= 2.5) return 'Good — Above average'
  if (upg <= 3.0) return 'Average'
  if (upg <= 3.5) return 'Below Average — More practice needed'
  return 'Needs significant improvement'
}

export function calcUPG(subStats: Partial<Record<Subject, { correct: number; total: number }>>): number | null {
  const subs = Object.keys(subStats) as Subject[]
  if (!subs.length) return null
  let ws = 0, wt = 0
  subs.forEach(s => {
    const st = subStats[s]!
    const w = UPG_WEIGHTS[s] || 0.25
    const pct = st.total > 0 ? (st.correct / st.total) * 100 : 0
    ws += transmutePct(pct) * w; wt += w
  })
  return wt > 0 ? parseFloat((ws / wt).toFixed(2)) : null
}
