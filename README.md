# eliquid 

Калькулятор жидкостей.

Основные возможности и особенности приложения.
- Калькулятор позволяет правильно подобрать объём компонентов при смешивании жидкостей для получения смеси заданного объёма, содержания никотина, процентных содержаний pg, vg, ad. Оптимизируется стоимость смеси при заданных ограничениях на минимальные и максимальные объёмы компонентов. Для оптимизации используются методы линейного программирования, так что решение можно найти при достаточно сложных условиях.
- Полученные варианты смесей можно сохранить и восстановить из архива.
- Можно вести учёт имеющихся компонентов и использовать их для создания смесей.
- Приложение работает через браузер, инсталляция не нужна. Данные сохраняются в локальном хранилище браузера (там они переживают сессию работы браузера) и, дополнительно могут сохраняться в аккаунте dropbox (с ним можно работать с разных компьютеров).

Ограничения приложения.
- Не используется БД а значит, на больших объёмах возможны проблемы с производительностью.
- Я ни разу не дизайнер, т.ч. прошу прощенья за аскетичный интерфейс.

Ссылки:
Основная - https://arch7tect.org/eliquid/index.html
На дропбоксе - https://dl.dropboxusercontent.com/spa/wlsuutf6akbtmf7/eliquid/public/index.html
Исходники - https://github.com/arch7tect/eliquid

Последние изменения:
- перевод ru/en
- список компонентов
- список смесей
- интеграция с dropbox
