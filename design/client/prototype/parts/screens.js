// Оглавление прототипа: экраны раздела 6 «Клиентское приложение.md», кто их собирает и какие состояния у них есть.
// Из этого списка строятся index.html и меню «Состояние» в служебной полосе. Сессия правит только строки своих экранов:
// built: true, когда экран собран; states - сценарии из parts/data.js (APS.SCENARIOS), в которых экран стоит смотреть.
window.APS = window.APS || {};
window.APS.SCREENS = [
  { id: 'today', file: 'today.html', name: 'Сегодня', session: 1, built: true,
    desc: 'Тренировка дня и «Начать», очная со временем и местом, новый ответ тренера, последний итог, лента недели',
    states: ['today', 'inperson', 'reply', 'paused', 'rest', 'plan-ended', 'trainer-records', 'disconnected'] },
  { id: 'workout', file: 'workout.html', params: { w: 'wk_w09d2' }, name: 'Тренировка: обзор', session: 1, built: true,
    desc: 'Упражнения по разделам, суперсет и трисет, примерное время, оборудование, заметки тренера, «Начать»',
    states: ['today', 'paused', 'inperson', 'trainer-records'] },
  { id: 'session', file: 'session.html', name: 'Выполнение тренировки', session: 2, built: true,
    desc: 'Режим зала: «как в плане» одним касанием, степперы, «прошлый раз», отдых, суперсет, бегунок усилия, «Больно», вопрос, «Не сделал», сохранение без сети',
    states: ['today', 'paused', 'inperson', 'trainer-records', 'disconnected'] },
  { id: 'exercise', file: 'exercise.html', params: { ex: 'ex_c85e2a7d416fb930', w: 'wk_w09d2', el: 'el_w09d2_rdl' }, name: 'Упражнение', session: 2, built: true,
    desc: 'Как выполнять, ошибки, видео-ссылка тренера, моя история по упражнению', states: ['today', 'paused'] },
  { id: 'finish', file: 'finish.html', params: { state: 'paused' }, name: 'Завершение и итог', session: 2, built: true,
    desc: 'Четыре необязательных вопроса на одном экране, затем итог с рекордами, сравнением и праздником; «Отметить, что сделал»', states: ['paused', 'today', 'trainer-records'] },
  { id: 'plan', file: 'plan.html', name: 'План', session: 3, built: true,
    desc: 'Эта и следующая неделя по дням, прошедшие с результатом; «не отмечена» с действиями без упрёка; «Пропустил» с причиной (?w=&miss=1)', states: ['today', 'inperson', 'rest', 'paused', 'trainer-records', 'reply', 'plan-ended', 'disconnected'] },
  { id: 'result', file: 'result.html', params: { w: 'wk_w08d2' }, name: 'Результат тренировки', session: 3, built: true,
    desc: 'Мой план и факт, рекорды, прошлый раз, мои ответы, ветка с тренером; «внёс тренер», «исправлено тренером», правка до конца дня (README, сессия 3)', states: ['today', 'plan-ended', 'disconnected'] },
  { id: 'progress', file: 'progress.html', name: 'Прогресс', session: 3, built: true,
    desc: 'Живой вывод, свежий рекорд, рабочий вес с выбором упражнения, рекорды по упражнениям, число тренировок, вес тела и «Добавить замер»', states: ['today', 'plan-ended', 'disconnected'] },
  { id: 'profile', file: 'profile.html', name: 'Тренер и профиль', session: 3, built: true,
    desc: 'Тренер и связь в Telegram, единицы, тема', states: ['today', 'disconnected'] },
];
