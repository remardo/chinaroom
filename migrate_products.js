const fs = require('fs');
const path = require('path');

// Категории маппинг
const categoryMap = {
  'Шкафы и гардеробные': { id: 'wardrobes', label: 'Шкафы и гардеробные' },
  'Кухни': { id: 'kitchens', label: 'Кухни' },
  'Ванные комнаты': { id: 'bathrooms', label: 'Ванные комнаты' },
  'Спальни': { id: 'bedrooms', label: 'Спальни' },
  'Гостиные': { id: 'livingrooms', label: 'Гостиные' },
  'Столы': { id: 'tables', label: 'Столы' },
  'Стулья': { id: 'chairs', label: 'Стулья' },
  'Диваны': { id: 'sofas', label: 'Диваны' },
  'Кровати': { id: 'beds', label: 'Кровати' },
  'Полки': { id: 'shelves', label: 'Полки' },
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

function parsePrice(priceStr) {
  const price = parseFloat(priceStr?.toString?.() || '0');
  return isNaN(price) ? null : price;
}

function parsePhotos(photoStr) {
  if (!photoStr) return [];
  return photoStr
    .split('|')
    .map(url => url.trim())
    .filter(url => url);
}

function parseSpecs(specStr) {
  if (!specStr) return [];

  // Разделяем по ";"
  return specStr
    .split(';')
    .map(spec => {
      const [key, value] = spec.split(':').map(s => s.trim());
      return key && value ? [key, value] : null;
    })
    .filter(Boolean);
}

// Читаем исходные данные
const sourceFile = path.join(__dirname, 'made_in_china_500_products.json');
const targetFile = path.join(__dirname, 'data', 'products.json');

const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
const existingData = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));

console.log(`Читаем ${sourceData.length} товаров...`);

let addedCount = 0;
let duplicateCount = 0;

const newProducts = sourceData.map((item, index) => {
  const categoryData = categoryMap[item['Категория']] || { id: 'other', label: item['Категория'] };
  const name = item['Адаптированное название на русском'];
  const id = slugify(name) + '-' + (existingData.length + addedCount + 1);

  // Проверяем дубликаты
  const isDuplicate = existingData.some(p => p.name === name);
  if (isDuplicate) {
    duplicateCount++;
    return null;
  }

  const photos = parsePhotos(item['Все фото']);
  const mainImage = item['Прямая ссылка на фото'] || photos[0] || 'img/placeholder.jpg';

  addedCount++;

  return {
    id,
    name,
    category: categoryData.id,
    categoryLabel: categoryData.label,
    price: Math.round(parsePrice(item['Цена']) * 100), // Переводим в копейки-аналог
    oldPrice: null,
    badge: null,
    image: mainImage,
    gallery: photos.length > 0 ? photos : [mainImage],
    short: item['Оригинальное название']?.slice(0, 150) || name,
    specs: parseSpecs(item['Тех. характеристики']),
    description: item['Описание'] || item['Оригинальное название'],
    supplier: item['Поставщик'],
    sourceUrl: item['Ссылка на товар'],
    moq: item['MOQ / минимальный заказ'],
  };
}).filter(Boolean);

console.log(`Добавляем ${addedCount} новых товаров...`);
console.log(`Пропущено дубликатов: ${duplicateCount}`);

const merged = [...existingData, ...newProducts];
fs.writeFileSync(targetFile, JSON.stringify(merged, null, 2), 'utf-8');

console.log(`✓ Готово. Всего товаров: ${merged.length}`);
