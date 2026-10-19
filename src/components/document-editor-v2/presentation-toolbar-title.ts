/**
 * Display model for the presentation editor toolbar title (ENG-230).
 *
 * The toolbar shows a visually truncated label, but the full value stays in
 * the data (and in the hover tooltip) so save/edit always uses the complete title.
 */

export interface PresentationToolbarTitleDisplay {
  text: string;
  titleAttr: string | undefined;
  containerClassName: string;
  textClassName: string;
}

export function getPresentationToolbarTitleDisplay(title: string): PresentationToolbarTitleDisplay {
  return {
    text: title,
    titleAttr: title.length > 0 ? title : undefined,
    // max-width caps the title column so a long title truncates instead of
    // pushing the toolbar's action buttons onto extra rows.
    containerClassName: "mr-2 min-w-0 max-w-xs sm:max-w-md",
    textClassName: "truncate text-sm font-semibold text-foreground",
  };
}
