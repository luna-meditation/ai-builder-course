import type { Course, CourseDashboard, Enrollment, Lesson, LessonBlock, LessonProgress, Profile, SessionUser, Submission } from "@/lib/types";

const now = "2026-07-17T04:00:00.000Z";

export const devProfiles = {
  student: {
    id: "c1111111-1111-4111-8111-111111111111", telegram_user_id: "100000001", username: "ai_builder_student",
    first_name: "Алексей", last_name: "Смирнов", photo_url: null, role: "student", is_blocked: false,
    created_at: "2026-07-09T04:00:00.000Z", last_seen_at: now,
  },
  admin: {
    id: "c2222222-2222-4222-8222-222222222222", telegram_user_id: "100000002", username: "ai_builder_admin",
    first_name: "Евгений", last_name: "Автор", photo_url: null, role: "admin", is_blocked: false,
    created_at: "2026-07-01T04:00:00.000Z", last_seen_at: now,
  },
  no_access: {
    id: "c3333333-3333-4333-8333-333333333333", telegram_user_id: "100000003", username: "without_access",
    first_name: "Мария", last_name: "Без доступа", photo_url: null, role: "student", is_blocked: false,
    created_at: "2026-07-16T04:00:00.000Z", last_seen_at: now,
  },
} satisfies Record<string, Profile>;

export const devCourse: Course = {
  id: "a1111111-1111-4111-8111-111111111111", title: "AI BUILDER — от идеи до своего продукта", slug: "ai-builder",
  description: "Пять практических шагов от первой идеи до опубликованного цифрового продукта. Минимум теории — максимум создания.",
  cover_url: null, status: "published", settings: { accent: "#6d5dfc", support_username: "ai_builder_support" },
};

export const devEnrollment: Enrollment = {
  id: "d1111111-1111-4111-8111-111111111111", user_id: devProfiles.student.id, course_id: devCourse.id,
  status: "active", access_source: "development_preview", plan: "standard", access_granted_at: "2026-07-09T04:00:00.000Z",
  access_revoked_at: null, completed_at: null,
};

const lessonSeed: Array<[string, string, string, string, string, Lesson["unlock_rule"]]> = [
  ["b1111111-1111-4111-8111-111111111111", "Ты действительно можешь это создать", "you-can-build-it", "Выберите идею, подготовьте инструменты и превратите сомнения в понятный первый шаг.", "У вас есть конкретная идея первого проекта, понятная аудитория и подготовленные инструменты.", "after_submission"],
  ["b2222222-2222-4222-8222-222222222222", "Создаём сайт или лендинг", "build-a-landing", "Спроектируйте, соберите и опубликуйте первый сайт с помощью ИИ и Codex.", "Готовый опубликованный сайт, рабочая мобильная версия и публичная ссылка.", "after_submission"],
  ["b3333333-3333-4333-8333-333333333333", "Создаём Telegram Mini App", "build-a-mini-app", "Создайте полезный сервис, который открывается внутри Telegram и сохраняет данные.", "Работающий Telegram-бот, Mini App и минимум одна функция с сохранением данных.", "after_submission"],
  ["b4444444-4444-4444-8444-444444444444", "Создаём собственную игру", "build-a-game", "Соберите небольшую игру с понятным циклом, прогрессом и мобильным управлением.", "Полностью запускаемая игра с одной сильной механикой, прогрессом и публичной ссылкой.", "after_approval"],
  ["b5555555-5555-4555-8555-555555555555", "Как превратить навык в деньги", "monetize-your-skill", "Упакуйте созданные проекты в предложение и составьте реалистичный план на 30 дней.", "Конкретный план монетизации: продукт, клиент, цена, канал поиска и действия на ближайшие 7 и 30 дней.", "none"],
];

const assignmentDescriptions = [
  "Опишите идею продукта, для кого он создаётся, какую проблему решает и какой результат получит пользователь.",
  "Добавьте публичную ссылку, минимум один скриншот и коротко опишите результат, проблему и способ её решения.",
  "Укажите username бота, ссылку, опишите функции и добавьте минимум два скриншота.",
  "Добавьте публичную ссылку, скриншоты, запись геймплея и опишите механику и улучшения.",
  "Составьте план монетизации: продукт, клиент, проблема, канал поиска, цена и действия на 7 и 30 дней.",
];

export const devLessons = lessonSeed.map((seed, index) => ({
  id: seed[0], course_id: devCourse.id, title: seed[1], slug: seed[2], short_description: seed[3], lesson_order: index + 1,
  expected_result: seed[4], video_type: null, video_url: null, unlock_rule: seed[5], assignment_required: true,
  is_published: true, assignment_description: assignmentDescriptions[index]!,
})) satisfies Array<Lesson & { assignment_description: string }>;

const progressStatuses: LessonProgress["status"][] = ["completed", "completed", "in_progress", "revision_requested", "available"];
export const devProgress = devLessons.map((lesson, index) => ({
  id: `f${index + 1}111111-1111-4111-8111-111111111111`, enrollment_id: devEnrollment.id, lesson_id: lesson.id,
  status: progressStatuses[index]!, unlocked_at: "2026-07-09T04:00:00.000Z", started_at: index < 4 ? now : null,
  submitted_at: index < 2 ? now : null, approved_at: index < 2 ? now : null, completed_at: index < 2 ? now : null,
})) satisfies LessonProgress[];

const lessonCopy = [
  ["Ваш старт — не код, а ясная идея", "Чтобы создать первый продукт, не нужно заранее понимать всю разработку. Сформулируйте результат, разбейте путь на маленькие шаги и используйте ИИ как наставника.", "Прояснить идею", "Выступи как продуктовый наставник. Задавай мне по одному простому вопросу, чтобы уточнить идею цифрового продукта и собрать ответы в краткое описание."],
  ["Лендинг — это один ясный маршрут", "Сильный сайт ведёт человека от первого обещания к одному действию: оффер, проблема, преимущества, доказательство и призыв.", "Структура лендинга", "Ты — продуктовый дизайнер. Для продукта [описание] и аудитории [аудитория] предложи структуру одностраничного лендинга с одним главным CTA."],
  ["Бот доставляет, Mini App взаимодействует", "Bot API отвечает за сообщения, а Mini App — за интерфейс. Подлинность пользователя подтверждает только серверная проверка initData.", "Выбор идеи Mini App", "Предложи 10 идей Telegram Mini App для аудитории [аудитория]. Каждая идея должна решать частую маленькую проблему одной основной функцией."],
  ["Одна механика, которую хочется повторить", "Создайте короткий цикл: действие — обратная связь — награда — усложнение. Затем добавьте прогресс, звук и полировку.", "Генератор идеи игры", "Предложи 12 идей браузерной игры с одной основной механикой, сессией 1–3 минуты и управлением одним пальцем."],
  ["Монетизируйте результат, а не обещание", "Ваши сайт, Mini App и игра — уже кейсы. Выберите одну услугу, конкретного клиента и измеримый результат.", "Упаковать предложение", "Помоги упаковать предложение на основе моего проекта [проект]: клиент, проблема, результат, состав работы, срок и стартовая цена."],
];

export const devBlocks: LessonBlock[] = devLessons.flatMap((lesson, index) => {
  const copy = lessonCopy[index]!;
  return [
    { id: `${lesson.id}-heading`, lesson_id: lesson.id, block_type: "heading", block_order: 1, content: { text: copy[0] }, settings: {} },
    { id: `${lesson.id}-paragraph`, lesson_id: lesson.id, block_type: "paragraph", block_order: 2, content: { text: copy[1] }, settings: {} },
    { id: `${lesson.id}-checklist`, lesson_id: lesson.id, block_type: "checklist", block_order: 3, content: { title: "Проверка результата", items: ["Основной шаг выполнен", "Результат проверен на телефоне", "Ссылка или файл готовы к отправке"] }, settings: {} },
    { id: `${lesson.id}-prompt`, lesson_id: lesson.id, block_type: "prompt", block_order: 4, content: { title: copy[2], description: "Готовый копируемый промпт", text: copy[3] }, settings: {} },
  ] as LessonBlock[];
});

export const devSubmissions: Submission[] = [
  {
    id: "e1111111-1111-4111-8111-111111111111", user_id: devProfiles.student.id, enrollment_id: devEnrollment.id,
    lesson_id: devLessons[0]!.id, attempt_number: 1, text_content: "Сервис помогает фрилансерам собирать требования клиента перед началом проекта.",
    external_url: null, status: "approved", submitted_at: "2026-07-10T04:00:00.000Z", reviewed_at: "2026-07-10T08:00:00.000Z",
    reviewed_by: devProfiles.admin.id, created_at: "2026-07-10T04:00:00.000Z", updated_at: "2026-07-10T08:00:00.000Z",
    submission_files: [], submission_comments: [],
  },
  {
    id: "e2222222-2222-4222-8222-222222222222", user_id: devProfiles.student.id, enrollment_id: devEnrollment.id,
    lesson_id: devLessons[3]!.id, attempt_number: 1, text_content: "Собрал игру на реакцию с серией побед и улучшениями.",
    external_url: "https://example.com/game", status: "revision_requested", submitted_at: "2026-07-16T04:00:00.000Z", reviewed_at: now,
    reviewed_by: devProfiles.admin.id, created_at: "2026-07-16T04:00:00.000Z", updated_at: now, submission_files: [],
    submission_comments: [{ id: "cc111111-1111-4111-8111-111111111111", submission_id: "e2222222-2222-4222-8222-222222222222", author_id: devProfiles.admin.id, comment: "Добавьте короткую запись геймплея и проверьте управление на мобильном устройстве.", is_visible_to_student: true, created_at: now }],
  },
];

export function devProfileForSession(session: SessionUser) {
  return Object.values(devProfiles).find((profile) => profile.id === session.profileId) ?? null;
}

export function devDashboard(profile: Profile = devProfiles.student): CourseDashboard {
  const completedCount = devProgress.filter((item) => item.status === "completed").length;
  return { profile, course: devCourse, enrollment: devEnrollment, lessons: devLessons.map((lesson) => ({ ...lesson, progress: devProgress.find((item) => item.lesson_id === lesson.id) ?? null })), percent: Math.round(completedCount / devLessons.length * 100), completedCount };
}

export function devSession(role: "student" | "admin" | "no_access"): SessionUser {
  const profile = devProfiles[role];
  return { profileId: profile.id, telegramUserId: String(profile.telegram_user_id), role: profile.role, firstName: profile.first_name, username: profile.username };
}
