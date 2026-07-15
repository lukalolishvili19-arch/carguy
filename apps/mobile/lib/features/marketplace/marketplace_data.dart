/// Shared marketplace form data — mirrors web `marketplace-data.ts`.
const carBrands = <String, List<String>>{
  'BMW': ['1 Series', '3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'M3', 'M5', 'i3', 'i4', 'iX'],
  'Mercedes': ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS', 'AMG GT', 'EQC', 'EQE'],
  'Audi': ['A3', 'A4', 'A6', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'e-tron', 'RS6'],
  'Toyota': ['Corolla', 'Camry', 'RAV4', 'Land Cruiser', 'Prius', 'Yaris', 'Hilux', 'Highlander', 'Supra'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'HR-V', 'Fit', 'Pilot', 'Odyssey'],
  'Nissan': ['Qashqai', 'X-Trail', 'Juke', 'Leaf', 'Altima', 'Patrol', 'Micra', 'GT-R'],
  'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Polo', 'Touareg', 'Jetta', 'Arteon', 'ID.4'],
  'Ford': ['Focus', 'Fiesta', 'Mustang', 'Explorer', 'Kuga', 'Ranger', 'Transit', 'Puma'],
  'Hyundai': ['i10', 'i20', 'i30', 'Tucson', 'Santa Fe', 'Elantra', 'Kona', 'Ioniq'],
  'Kia': ['Rio', 'Ceed', 'Sportage', 'Sorento', 'Stinger', 'EV6', 'Niro', 'Picanto'],
  'Mazda': ['2', '3', '6', 'CX-3', 'CX-5', 'CX-30', 'MX-5'],
  'Lexus': ['IS', 'ES', 'RX', 'NX', 'GX', 'LX', 'UX', 'LC'],
  'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman'],
  'Volvo': ['S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90'],
  'Subaru': ['Impreza', 'Forester', 'Outback', 'XV', 'WRX', 'BRZ'],
  'Mitsubishi': ['Lancer', 'Outlander', 'ASX', 'Pajero', 'Eclipse Cross'],
  'Chevrolet': ['Cruze', 'Malibu', 'Captiva', 'Tahoe', 'Camaro', 'Corvette'],
  'Jeep': ['Wrangler', 'Grand Cherokee', 'Renegade', 'Compass', 'Cherokee'],
  'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y'],
  'Opel': ['Corsa', 'Astra', 'Insignia', 'Mokka', 'Crossland', 'Grandland'],
  'Peugeot': ['208', '308', '3008', '5008', '508', '2008'],
  'Renault': ['Clio', 'Megane', 'Captur', 'Kadjar', 'Duster', 'Scenic'],
  'Skoda': ['Fabia', 'Octavia', 'Superb', 'Kodiaq', 'Karoq', 'Scala'],
  'Suzuki': ['Swift', 'Vitara', 'Jimny', 'SX4', 'Baleno'],
  'Fiat': ['500', 'Panda', 'Tipo', 'Punto', 'Doblo'],
  'Land Rover': ['Defender', 'Discovery', 'Range Rover', 'Range Rover Sport', 'Evoque'],
  'Jaguar': ['XE', 'XF', 'F-Pace', 'E-Pace', 'F-Type'],
  'Mini': ['Cooper', 'Countryman', 'Clubman'],
  'Dodge': ['Challenger', 'Charger', 'Durango', 'Ram'],
  'Lada': ['Vesta', 'Granta', 'Niva', 'Largus'],
  'Geely': ['Coolray', 'Atlas', 'Emgrand', 'Tugella'],
  'BYD': ['Atto 3', 'Han', 'Tang', 'Seal'],
  'Chery': ['Tiggo 4', 'Tiggo 7', 'Tiggo 8', 'Arrizo'],
  'Haval': ['Jolion', 'F7', 'H6', 'Dargo'],
};

List<String> get brandNames => carBrands.keys.toList()..sort();

List<String> modelsForBrand(String brand) => carBrands[brand] ?? const [];

List<int> get yearOptions {
  final current = DateTime.now().year;
  return [for (var y = current; y >= 1980; y--) y];
}

const georgianCities = [
  'თბილისი',
  'ბათუმი',
  'ქუთაისი',
  'რუსთავი',
  'გორი',
  'ზუგდიდი',
  'ფოთი',
  'თელავი',
  'სამტრედია',
  'ზესტაფონი',
  'მარნეული',
  'ხაშური',
  'ოზურგეთი',
  'ბორჯომი',
  'ახალციხე',
  'ქობულეთი',
  'სენაკი',
  'მცხეთა',
  'გარდაბანი',
  'ბაკურიანი',
  'გუდაური',
  'ბოლნისი',
];

const rimRadiusOptions = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

const listingCategories = ['CAR', 'MOTORCYCLE', 'PART', 'WHEEL', 'ACCESSORY'];

const fuelTypes = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'PLUGIN_HYBRID', 'LPG', 'HYDROGEN'];

String categoryLabel(String c) => switch (c) {
      'CAR' => 'Cars',
      'MOTORCYCLE' => 'Motorcycles',
      'PART' => 'Parts',
      'WHEEL' => 'Wheels',
      'ACCESSORY' => 'Accessories',
      _ => c,
    };
