export enum Routes {
  DASHBOARD = "/dashboard",
  DOCUMENTS = "/documents",
  LESSON_PLAN_EDITOR = "/lesson-plan/:id",
  LESSON_PLAN = "/lesson-plan",
  ASSAYS = "/assays",
  QUIZ = "/quiz",
  PRESENTATION = "/presentation",
  ADMIN = "/admin",
  COMMUNITY = "/community",
  AI_ASSISTANT = "/ai-assistant",
  SETTINGS = "/settings",
  QUICK_GENERATOR = "/quick-generator",
  COMMUNITY_MODERATE = "/community/moderate",
  LOGIN = "/login",
  SIGNUP = "/signup",
}

export enum APIRoutes {
  DOCUMENTS = "/api/documents",
  PROCESS_CURRICULUM = "/api/process-curriculum",
  ADMIN = "/api/admin",
  AUTH_SESSION = "/api/auth/session",
  AUTH_SIGNIN = "/api/auth/signin",
  AUTH_SIGNUP = "/api/auth/signup",
  AUTH_SIGNOUT = "/api/auth/signout",
}
