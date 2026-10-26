const BRANDS_AND_MODELS = [
  { brand: "Toyota", models: ["Corolla", "Camry", "RAV4", "Yaris", "Prius"] },
  { brand: "Honda", models: ["Civic", "Accord", "CR-V", "Fit", "HR-V"] },
  { brand: "BMW", models: ["3 Series", "5 Series", "X3", "X5", "i4"] },
  { brand: "Mercedes-Benz", models: ["C-Class", "E-Class", "GLC", "A-Class", "GLA"] },
  { brand: "Volkswagen", models: ["Golf", "Passat", "Tiguan", "Polo", "ID.4"] },
  { brand: "Hyundai", models: ["Elantra", "Tucson", "Kona", "Sonata", "i30"] },
  { brand: "Kia", models: ["Sportage", "Ceed", "Niro", "Seltos", "Forte"] },
  { brand: "Ford", models: ["Focus", "Fiesta", "Mustang", "Kuga", "Puma"] },
  { brand: "Audi", models: ["A3", "A4", "Q5", "Q3", "e-tron"] },
  { brand: "Nissan", models: ["Leaf", "Qashqai", "Juke", "X-Trail", "Micra"] },
];

const FULL_NAMES = [
  // Male
  { firstName: "Aliaksandr", lastName: "Kazlou" },
  { firstName: "Dzmitry", lastName: "Ivanov" },
  { firstName: "Mikhail", lastName: "Kavalenka" },
  { firstName: "Andrei", lastName: "Marozau" },
  { firstName: "Siarhei", lastName: "Novikau" },
  { firstName: "Pavel", lastName: "Barysevich" },
  { firstName: "Ivan", lastName: "Lebedev" },
  { firstName: "Viktar", lastName: "Drazdou" },
  // Female
  { firstName: "Volha", lastName: "Zhukava" },
  { firstName: "Katsiaryna", lastName: "Shumskaya" },
  { firstName: "Natallia", lastName: "Baranava" },
  { firstName: "Iryna", lastName: "Karpovich" },
  { firstName: "Hanna", lastName: "Paulava" },
  { firstName: "Yuliya", lastName: "Klimovich" },
  { firstName: "Maryia", lastName: "Sokal" },
];

const LOCATION_BOUNDS = {
  latMin: 53.84,
  latMax: 53.96,
  lngMin: 27.4,
  lngMax: 27.7,
};

module.exports = { BRANDS_AND_MODELS, FULL_NAMES, LOCATION_BOUNDS };
