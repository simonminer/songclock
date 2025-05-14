/**
 * Track an event in Google Analytics
 */
export const trackEvent = (
  eventName: string,
  eventCategory: string,
  eventLabel?: string,
  eventValue?: number,
  nonInteraction = false,
) => {
  // Check if gtag is available (client-side only)
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, {
      event_category: eventCategory,
      event_label: eventLabel,
      value: eventValue,
      non_interaction: nonInteraction,
    })

    // Log events during development
    if (process.env.NODE_ENV === "development") {
      console.log(`[GA Event] ${eventName}:`, {
        category: eventCategory,
        label: eventLabel,
        value: eventValue,
      })
    }
  }
}

/**
 * Track a button click
 */
export const trackButtonClick = (buttonName: string, label?: string) => {
  trackEvent("button_click", "UI Interaction", `${buttonName}${label ? ` - ${label}` : ""}`)
}

/**
 * Track a keyboard shortcut
 */
export const trackKeyboardShortcut = (key: string, action: string) => {
  trackEvent("keyboard_shortcut", "User Input", `${key} - ${action}`)
}

/**
 * Add window.gtag type definition
 */
declare global {
  interface Window {
    gtag: (
      command: string,
      action: string,
      params?: {
        [key: string]: any
      },
    ) => void
    dataLayer: any[]
  }
}
