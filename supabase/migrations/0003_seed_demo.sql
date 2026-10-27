-- ДЕМО-ДАННЫЕ: цены вымышленные, замените в панели менеджера/админа. Можно запускать повторно.
insert into service_categories(name, slug, sort) values
 ('Полы','floors',1),('Стены и потолки','walls',2),('Электрика','electric',3),('Прочее','other',4)
on conflict (slug) do nothing;

insert into services(category_id, name, slug, description, unit, base_price, price_note, material_included, is_published)
select c.id, v.name, v.slug, v.descr, v.unit, v.price, v.note, false, true
from (values
 ('floors','Укладка ламината','laminate','Укладка ламината на подготовленное основание','m2',780,'Демо-цена. Материал и подложка не входят',false),
 ('floors','Укладка плитки','tile','Укладка напольной плитки','m2',1100,'Демо-цена. Плитка и клей не входят',false),
 ('walls','Поклейка обоев','wallpaper','Поклейка обоев под покраску или с рисунком','m2',420,'Демо-цена. Обои и клей не входят',false),
 ('walls','Покраска стен','paint','Покраска стен в два слоя','m2',350,'Демо-цена. Краска не входит',false),
 ('walls','Монтаж плинтуса','baseboard','Монтаж напольного плинтуса','m',190,'Демо-цена. Плинтус не входит',false),
 ('electric','Замена розетки','socket','Замена или установка розетки','pcs',450,'Демо-цена. Розетка не входит',false),
 ('other','Вывоз мусора','trash','Вывоз строительного мусора','fixed',3500,'Демо-цена. Фиксированная стоимость за вывоз',false)
) as v(cat, name, slug, descr, unit, price, note, mat)
join service_categories c on c.slug = v.cat
on conflict (slug) do nothing;
