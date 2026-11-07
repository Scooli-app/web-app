# Graph Report - src  (2026-05-27)

## Corpus Check
- 248 files · ~108,292 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1301 nodes · 3348 edges · 73 communities (67 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community Library & Resources|Community Library & Resources]]
- [[_COMMUNITY_Document Download Pipeline|Document Download Pipeline]]
- [[_COMMUNITY_Document Templates|Document Templates]]
- [[_COMMUNITY_Admin Feedback Inbox|Admin Feedback Inbox]]
- [[_COMMUNITY_Rich Text Editor & Diff|Rich Text Editor & Diff]]
- [[_COMMUNITY_Admin Feedback Surveys|Admin Feedback Surveys]]
- [[_COMMUNITY_Onboarding Flow|Onboarding Flow]]
- [[_COMMUNITY_Admin Feature Flags|Admin Feature Flags]]
- [[_COMMUNITY_School Admin Pages|School Admin Pages]]
- [[_COMMUNITY_Admin Cost Insights|Admin Cost Insights]]
- [[_COMMUNITY_Root Layout & Theming|Root Layout & Theming]]
- [[_COMMUNITY_Source Ingestion|Source Ingestion]]
- [[_COMMUNITY_Document Slice & Sharing|Document Slice & Sharing]]
- [[_COMMUNITY_Sidebar Navigation|Sidebar Navigation]]
- [[_COMMUNITY_Upload & Bug Report Forms|Upload & Bug Report Forms]]
- [[_COMMUNITY_Document Creation Constants|Document Creation Constants]]
- [[_COMMUNITY_Checkout & Subscriptions|Checkout & Subscriptions]]
- [[_COMMUNITY_Shared Types & API Models|Shared Types & API Models]]
- [[_COMMUNITY_Dashboard & Bootstrap|Dashboard & Bootstrap]]
- [[_COMMUNITY_Assistant Streaming|Assistant Streaming]]
- [[_COMMUNITY_AI Chat Panel UI|AI Chat Panel UI]]
- [[_COMMUNITY_Assistant Button & Sidebar UI|Assistant Button & Sidebar UI]]
- [[_COMMUNITY_Document Images & Streaming|Document Images & Streaming]]
- [[_COMMUNITY_Admin User Insights|Admin User Insights]]
- [[_COMMUNITY_Document Creation Page|Document Creation Page]]
- [[_COMMUNITY_Document Editor Shell|Document Editor Shell]]
- [[_COMMUNITY_Settings & Entitlements|Settings & Entitlements]]
- [[_COMMUNITY_Document Service|Document Service]]
- [[_COMMUNITY_Document Filters & Feature Flags|Document Filters & Feature Flags]]
- [[_COMMUNITY_Community Moderation|Community Moderation]]
- [[_COMMUNITY_Share Modal & Filters|Share Modal & Filters]]
- [[_COMMUNITY_Chat UI Primitives|Chat UI Primitives]]
- [[_COMMUNITY_Page Layout Primitives|Page Layout Primitives]]
- [[_COMMUNITY_Document Store Selectors|Document Store Selectors]]
- [[_COMMUNITY_Auth Pages & Layout|Auth Pages & Layout]]
- [[_COMMUNITY_Workspace & Organization|Workspace & Organization]]
- [[_COMMUNITY_Editor Image Block|Editor Image Block]]
- [[_COMMUNITY_Middleware & Clerk Helpers|Middleware & Clerk Helpers]]
- [[_COMMUNITY_Tutorial Overlay|Tutorial Overlay]]
- [[_COMMUNITY_Main Section Landing Pages|Main Section Landing Pages]]
- [[_COMMUNITY_Document Card UI|Document Card UI]]
- [[_COMMUNITY_School Dashboard Page|School Dashboard Page]]
- [[_COMMUNITY_School Admin Guard|School Admin Guard]]
- [[_COMMUNITY_Assistant Provider & Selectors|Assistant Provider & Selectors]]
- [[_COMMUNITY_API Client|API Client]]
- [[_COMMUNITY_Assistant Panel & Empty State|Assistant Panel & Empty State]]
- [[_COMMUNITY_Health Status|Health Status]]
- [[_COMMUNITY_Editor Analytics Hook|Editor Analytics Hook]]
- [[_COMMUNITY_Rich Text Editor Wrapper|Rich Text Editor Wrapper]]
- [[_COMMUNITY_Worksheet Variant Section|Worksheet Variant Section]]
- [[_COMMUNITY_Lesson Plan Editor Page|Lesson Plan Editor Page]]
- [[_COMMUNITY_Presentation Editor Page|Presentation Editor Page]]
- [[_COMMUNITY_Quiz Editor Page|Quiz Editor Page]]
- [[_COMMUNITY_Test Editor Page|Test Editor Page]]
- [[_COMMUNITY_Worksheet Editor Page|Worksheet Editor Page]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 126 edges
2. `Button()` - 53 edges
3. `useAppSelector` - 53 edges
4. `useAppDispatch()` - 44 edges
5. `Card()` - 36 edges
6. `DocumentType` - 23 edges
7. `PageContainer()` - 20 edges
8. `PageHeader()` - 19 edges
9. `Badge()` - 19 edges
10. `RootState` - 19 edges

## Surprising Connections (you probably didn't know these)
- `AdminFeaturesPage()` --calls--> `useAdmin()`  [EXTRACTED]
  app/(main)/admin/features/page.tsx → hooks/useAdmin.ts
- `ActivityBadge()` --calls--> `cn()`  [EXTRACTED]
  app/(main)/admin/users/page.tsx → shared/utils/utils.ts
- `SummaryStatCard()` --calls--> `cn()`  [EXTRACTED]
  app/(main)/admin/users/page.tsx → shared/utils/utils.ts
- `DashboardContent()` --calls--> `useAppSelector`  [EXTRACTED]
  app/(main)/dashboard/page.tsx → store/hooks.ts
- `Tabs()` --calls--> `cn()`  [EXTRACTED]
  components/document-editor/AIChatPanel.tsx → shared/utils/utils.ts

## Communities (73 total, 6 thin omitted)

### Community 0 - "Community Library & Resources"
Cohesion: 0.05
Nodes (67): ContributorStats, discoverResources(), DiscoverResourcesParams, getContributorStats(), getLibraryStats(), getMyResources(), getResource(), getReusedResourceIds() (+59 more)

### Community 1 - "Document Download Pipeline"
Cohesion: 0.05
Nodes (72): appendInlineContent(), ASCII_PDF_CHARACTER_MAP, buildDocxMathTextRuns(), buildDocxTable(), buildImageLookup(), captureDownloadEvent(), convertMathToText(), createDocxMathTextRun() (+64 more)

### Community 2 - "Document Templates"
Cohesion: 0.06
Nodes (51): createTemplate(), createTemplateFromDocument(), CreateTemplateRequest, getTemplates(), mapResponseToTemplate(), setDefaultTemplate(), TemplateResponse, TemplateSectionResponse (+43 more)

### Community 3 - "Admin Feedback Inbox"
Cohesion: 0.07
Nodes (44): addInternalNote, adminFeedbackSlice, AdminFeedbackState, fetchFeedbackDetail, fetchFeedbackList, fetchMetrics, initialState, sendResponse (+36 more)

### Community 4 - "Rich Text Editor & Diff"
Cohesion: 0.06
Nodes (46): DiffToolbar, DiffToolbarProps, buildDecorations(), Commands, createActionWidget(), createDeleteWidget(), DiffExtension, diffPluginKey (+38 more)

### Community 5 - "Admin Feedback Surveys"
Cohesion: 0.06
Nodes (37): AdminFeedbackSurveyBreakdownItem, AdminFeedbackSurveyOverview, AdminFeedbackSurveyResponse, adminFeedbackSurveyService, AdminFeedbackSurveySummary, feedbackSurveyService, userService, AppFeedbackSurveyGate() (+29 more)

### Community 6 - "Onboarding Flow"
Cohesion: 0.08
Nodes (35): AdminOnboardingBreakdownItem, AdminOnboardingOverview, AdminOnboardingResponse, adminOnboardingService, AdminOnboardingSummary, onboardingService, AcquisitionOption, acquisitionOptions (+27 more)

### Community 7 - "Admin Feature Flags"
Cohesion: 0.07
Nodes (35): AdminFeatureFlag, FeatureOverrideDto, getFlag(), getOrganizationById(), getUserById(), listFlags(), listPlans(), OrganizationSearchResult (+27 more)

### Community 8 - "School Admin Pages"
Cohesion: 0.15
Nodes (17): FeedbackActionCardsProps, ROLE_LABELS, STATUS_LABELS, Card(), CardContent(), CardDescription(), CardHeader(), CardTitle() (+9 more)

### Community 9 - "Admin Cost Insights"
Cohesion: 0.12
Nodes (25): AdminPage(), AdminCostInsightsResponse, adminCostInsightsService, AdminCostSummary, AdminUserCost, CostInsightsFilters, ModelCostDto, AdminCostsPage() (+17 more)

### Community 10 - "Root Layout & Theming"
Cohesion: 0.10
Nodes (13): lexend, metadata, THEME_OPTIONS, AppDispatch, RootState, store, DropdownMenuItem, Toaster() (+5 more)

### Community 11 - "Source Ingestion"
Cohesion: 0.13
Nodes (23): deleteSource(), getSource(), getSourceQuota(), listSources(), uploadSource(), PENDING_STATUSES, formatSize(), QuotaBar() (+15 more)

### Community 12 - "Document Slice & Sharing"
Cohesion: 0.10
Nodes (22): chatWithDocument(), createDocument(), updateDocument(), unshareDocumentResource, ShareResourceModal(), ShareButton, ShareButtonProps, createDocument (+14 more)

### Community 13 - "Sidebar Navigation"
Cohesion: 0.09
Nodes (20): ADMIN_NAVIGATION, CONTENT_CREATION, DisabledNavMenuItem, ExternalNavMenuItem, NavGroup, NAVIGATION, NavItem, NavMenuItem (+12 more)

### Community 14 - "Upload & Bug Report Forms"
Cohesion: 0.15
Nodes (18): getUploadUrl(), importDocument(), SUBJECTS_BY_GRADE, BugReportForm(), BugReportFormProps, SuggestionForm(), SuggestionFormProps, ALLOWED_TYPES (+10 more)

### Community 15 - "Document Creation Constants"
Cohesion: 0.14
Nodes (19): AMBIGUOUS_COMPONENTS_SUBJECTS, GRADE_GROUPS, GradeGroup, LESSON_TIMES, LessonTime, Subject, SubjectConfig, SUBJECTS (+11 more)

### Community 16 - "Checkout & Subscriptions"
Cohesion: 0.12
Nodes (15): createCheckoutSession(), createPortalSession(), getSubscriptionPlans(), calculateMonthlyEquivalent(), calculateSavings(), CheckoutContent(), CheckoutError, ErrorType (+7 more)

### Community 17 - "Shared Types & API Models"
Cohesion: 0.17
Nodes (20): AIChatPanelProps, DocumentState, BackendPaginatedResponse, ChatResponse, CreateDocumentStreamResponse, DocumentFilters, DocumentStatsResponse, DocumentStreamCallbacks (+12 more)

### Community 18 - "Dashboard & Bootstrap"
Cohesion: 0.11
Nodes (16): getCurrentSubscription(), getUsageStats(), DashboardContent(), AppBootstrapGate(), ClerkGetToken, decodeJwtPayload(), getOrganizationIdFromToken(), fetchOnboardingStatus (+8 more)

### Community 19 - "Assistant Streaming"
Cohesion: 0.13
Nodes (17): ChatHistoryItem, ChatStreamCallbacks, streamChatMessage(), StreamEvent, getCurrentEntitlement(), assistantSlice, AssistantState, initialState (+9 more)

### Community 20 - "AI Chat Panel UI"
Cohesion: 0.15
Nodes (17): ChatContent(), ChatMessage, Tabs(), useIsMobile(), Sheet(), SheetContent(), SheetDescription(), SheetHeader() (+9 more)

### Community 21 - "Assistant Button & Sidebar UI"
Cohesion: 0.15
Nodes (20): AssistantButton(), AssistantButtonProps, GenerationsIndicator(), ScrollArea(), ScrollBar(), Sidebar(), SidebarContent(), SidebarContext (+12 more)

### Community 22 - "Document Images & Streaming"
Cohesion: 0.13
Nodes (17): deleteDocumentImage(), getDocumentImages(), regenerateDocumentImage(), uploadDocumentImage(), streamDocumentContent(), DownloadButton, DownloadButtonProps, downloadDocument() (+9 more)

### Community 23 - "Admin User Insights"
Cohesion: 0.14
Nodes (17): AdminUserActivityBucket, AdminUserInsight, AdminUserInsightsResponse, adminUserInsightsService, AdminUserInsightsSummary, ActivityBadge(), AdminUsersPage(), bucketBadgeClasses (+9 more)

### Community 24 - "Document Creation Page"
Cohesion: 0.19
Nodes (16): DocumentCreationPage(), DocumentCreationPageProps, useDocumentForm(), DocumentTypeConfig, AdditionalDetailsSection(), DurationSection(), FormActions(), FormActionsProps (+8 more)

### Community 25 - "Document Editor Shell"
Cohesion: 0.13
Nodes (14): MAX_LENGTHS, ChatMessage, containsLeakedImageSegmentTokens(), DocumentEditorProps, GENERATION_STEPS, GenerationStepKey, repairLeakedImageSegmentTokens(), STEP_ORDER (+6 more)

### Community 26 - "Settings & Entitlements"
Cohesion: 0.15
Nodes (10): selectCurrentEntitlement(), selectEffectiveAccessSource(), selectEntitlementLoading(), selectEntitlementUsage(), calculateMonthlyEquivalent(), formatDate(), formatPrice(), getEffectiveAccessDisplayLabel() (+2 more)

### Community 27 - "Document Service"
Cohesion: 0.18
Nodes (12): deleteDocument(), deleteDocuments(), getDocument(), getDocuments(), getDocumentStats(), isRagSourceArray(), normalizeDocument(), waitForDocument() (+4 more)

### Community 28 - "Document Filters & Feature Flags"
Cohesion: 0.13
Nodes (14): selectEnabledFeatureFlags, selectFeatureFlags, selectIsContextPipelineV2Enabled, selectIsPresentationCreationEnabled, selectIsTemplateFromDocumentEnabled, selectIsWorksheetCreationEnabled, DocumentFilters(), DocumentFiltersProps (+6 more)

### Community 29 - "Community Moderation"
Cohesion: 0.20
Nodes (17): ModerationQueue(), CommunityLibraryPage(), CommunityPage(), DocumentEditor(), ShareButtonComponent(), useDocumentManager(), AdminFeedbackDetailArgsPage(), SourceIngestionTracker() (+9 more)

### Community 30 - "Share Modal & Filters"
Cohesion: 0.21
Nodes (9): GRADE_OPTIONS, RESOURCE_TYPE_OPTIONS, ShareDestination, SUBJECT_OPTIONS, DestinationOption, ShareResourceModalProps, SortableSectionProps, Input() (+1 more)

### Community 31 - "Chat UI Primitives"
Cohesion: 0.18
Nodes (9): ChatInput(), ChatInputProps, ChatMessage(), ChatMessageProps, TypingIndicator(), TypingIndicatorProps, GenerationCostHint(), GenerationCostHintProps (+1 more)

### Community 32 - "Page Layout Primitives"
Cohesion: 0.21
Nodes (7): FeedbackActionCards(), ContainerSize, PageContainer(), PageContainerProps, SIZE_CLASSES, PageHeader(), PageHeaderProps

### Community 33 - "Document Store Selectors"
Cohesion: 0.18
Nodes (11): fetchDocument, updateDocument, selectCurrentDocument, selectEditorState, selectImageError, selectImages, selectIsChatting, selectIsGeneratingImages (+3 more)

### Community 34 - "Auth Pages & Layout"
Cohesion: 0.20
Nodes (6): AuthLayout(), AuthLayoutProps, ThemeToggle, AcceptOrganizationInvitationContent(), formatRoleLabel(), normalizeEmail()

### Community 35 - "Workspace & Organization"
Cohesion: 0.23
Nodes (11): getCurrentOrganizationDashboard(), getCurrentOrganizationMembers(), getCurrentWorkspace(), OrganizationDashboard, OrganizationMember, WorkspaceContext, fetchOrganizationMembers, fetchWorkspace (+3 more)

### Community 36 - "Editor Image Block"
Cohesion: 0.18
Nodes (8): deleteDocumentImage, regenerateDocumentImage, buildImageEventProps(), ImageBlockNodeView(), normalizeImageWidth(), PendingImageDeletion, pendingImageDeletions, selectIsPro()

### Community 37 - "Middleware & Clerk Helpers"
Cohesion: 0.16
Nodes (10): config, dashboardUrl, isOrganizationAdmin, isPublicRoute, publicMetadata, redirectPath, res, signUpUrl (+2 more)

### Community 38 - "Tutorial Overlay"
Cohesion: 0.16
Nodes (12): TutorialContext, TutorialContextValue, TutorialProvider(), useTutorial(), OnboardingGate(), HighlightRect, STEPS, TutorialIntro() (+4 more)

### Community 40 - "Document Card UI"
Cohesion: 0.17
Nodes (8): Checkbox, dateFormatter, DOCUMENT_TYPE_COLORS, DOCUMENT_TYPE_ICONS, DOCUMENT_TYPE_LABELS, DocumentCardComponent(), DocumentCardProps, ROUTE_MAP

### Community 41 - "School Dashboard Page"
Cohesion: 0.21
Nodes (8): DOCUMENT_TYPE_LABELS, formatCountLabel(), formatDate(), formatSubscriptionStatus(), ROLE_LABELS, SchoolDashboardPage(), STATS, SUBSCRIPTION_STATUS_LABELS

### Community 42 - "School Admin Guard"
Cohesion: 0.20
Nodes (7): listRegulatorySources(), SchoolAdminGuard(), SourcePickerSectionProps, Routes, selectHasOrganizationWorkspace(), selectIsOrganizationAdmin(), selectWorkspaceReady()

### Community 43 - "Assistant Provider & Selectors"
Cohesion: 0.27
Nodes (7): AssistantProvider(), selectHasUnreadMessages, selectInputValue, selectIsOpen, selectIsProcessing, selectMessages, selectStreamingContent

### Community 44 - "API Client"
Cohesion: 0.20
Nodes (7): apiClient, contentType, GetTokenFn, injectStore(), originalRequest, setApiTokenGetter(), UpgradeLimitError

### Community 45 - "Assistant Panel & Empty State"
Cohesion: 0.22
Nodes (8): AssistantPanel(), AssistantPanelProps, Message, EmptyState(), EmptyStateProps, QUICK_ACTIONS, TooltipContent(), TooltipProvider()

### Community 46 - "Health Status"
Cohesion: 0.39
Nodes (7): StatusCard(), getHealth(), getStatusColorClass(), getStatusText(), HealthResponse, HealthStatus, ServiceStatus

### Community 47 - "Editor Analytics Hook"
Cohesion: 0.29
Nodes (3): createSessionMetrics(), SessionMetrics, useEditorAnalytics()

### Community 48 - "Rich Text Editor Wrapper"
Cohesion: 0.33
Nodes (3): RichTextEditor, RichTextEditorProps, TipTapEditor

### Community 49 - "Worksheet Variant Section"
Cohesion: 0.40
Nodes (5): DocumentImportRequest, VARIANT_OPTIONS, WorksheetVariantSectionProps, CreateDocumentParams, WorksheetVariant

## Knowledge Gaps
- **272 isolated node(s):** `isPublicRoute`, `redirectPath`, `res`, `dashboardUrl`, `signUpUrl` (+267 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Assistant Button & Sidebar UI` to `Community Library & Resources`, `Document Templates`, `Admin Feedback Inbox`, `Admin Feedback Surveys`, `Onboarding Flow`, `Admin Feature Flags`, `School Admin Pages`, `Admin Cost Insights`, `Source Ingestion`, `Sidebar Navigation`, `Upload & Bug Report Forms`, `Document Creation Constants`, `AI Chat Panel UI`, `Admin User Insights`, `Document Creation Page`, `Document Editor Shell`, `Document Service`, `Community Moderation`, `Share Modal & Filters`, `Chat UI Primitives`, `Page Layout Primitives`, `Editor Image Block`, `Tutorial Overlay`, `Document Card UI`, `School Admin Guard`, `Assistant Panel & Empty State`, `Worksheet Variant Section`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `Button()` connect `Document Templates` to `Community Library & Resources`, `Admin Feedback Inbox`, `Admin Feedback Surveys`, `Onboarding Flow`, `Admin Feature Flags`, `School Admin Pages`, `Admin Cost Insights`, `Root Layout & Theming`, `Document Slice & Sharing`, `Sidebar Navigation`, `Upload & Bug Report Forms`, `AI Chat Panel UI`, `Assistant Button & Sidebar UI`, `Document Images & Streaming`, `Admin User Insights`, `Document Creation Page`, `Settings & Entitlements`, `Document Service`, `Document Filters & Feature Flags`, `Share Modal & Filters`, `Chat UI Primitives`, `Page Layout Primitives`, `Auth Pages & Layout`, `Tutorial Overlay`, `Document Card UI`, `School Dashboard Page`, `Assistant Panel & Empty State`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `useAppDispatch()` connect `Community Moderation` to `Community Library & Resources`, `Document Store Selectors`, `Admin Feedback Inbox`, `Editor Image Block`, `Onboarding Flow`, `Tutorial Overlay`, `School Admin Pages`, `School Dashboard Page`, `School Admin Guard`, `Source Ingestion`, `Assistant Provider & Selectors`, `Document Slice & Sharing`, `Sidebar Navigation`, `Dashboard & Bootstrap`, `Document Creation Page`, `Document Editor Shell`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `isPublicRoute`, `redirectPath`, `res` to the rest of the system?**
  _272 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community Library & Resources` be split into smaller, more focused modules?**
  _Cohesion score 0.05246913580246913 - nodes in this community are weakly interconnected._
- **Should `Document Download Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.051228070175438595 - nodes in this community are weakly interconnected._
- **Should `Document Templates` be split into smaller, more focused modules?**
  _Cohesion score 0.06317907444668008 - nodes in this community are weakly interconnected._