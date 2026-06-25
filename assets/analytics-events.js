(() => {
  const body = document.body;

  /**
   * Tracks newsletter signup form submissions and pushes "email_signup" to dataLayer.
   *
   * @param {SubmitEvent} e
   */
  const trackNewsLettersubmissions = (e) => {
    const form = e.target.closest("form[data-track-email-signup]");
    if (!form) {
      return;
    }

    const signup_source = form.dataset.signupSource || "";
    const email = form.querySelector('input[type="email"]')?.value || "";

    if (!email) {
      return;
    }

    Shopify.analytics.publish("gtmEvent", {
      event_name: "email_signup",
      signup_source: signup_source,
      customer: {
        email: email,
      },
    });
  };

  body.addEventListener("submit", trackNewsLettersubmissions);

  /**
   * Tracks clicks on elements with [data-nav-click] (or custom nav:click events)
   * and pushes a navigation event to dataLayer.
   *
   * @param {Event} e
   */
  const trackNavigation = (e) => {
    const anchor =
      e.target.closest("a[data-nav-click], button[data-nav-click]") ??
      e.detail?.element;
    if (!anchor) {
      return;
    }
    const { navType, navCategory, navSubcategory, navElement } = anchor.dataset;

    Shopify.analytics.publish("gtmEvent", {
      event_name: "navigation",
      navigation_type: navType?.toLowerCase() || "",
      navigation_category: navCategory?.toLowerCase() || "",
      navigation_subcategory: navSubcategory?.toLowerCase() || "",
      navigation_element: navElement?.toLowerCase() || "",
    });
  };

  document.addEventListener("click", trackNavigation);
  body.addEventListener("nav:click", trackNavigation);

  /**
   * Pushes video events ('start','progress','complete') to dataLayer.
   *
   * @param {CustomEvent<{url: string, title: string, duration: number, currentTime: number, percent: number}>} e
   */
  const handleVideoEvent = (e) => {
    const eventName = e.type.replace(":", "_");
    const status = e.type.replace("video:", "");
    const { url, title, duration, currentTime, percent } = e.detail;

    Shopify.analytics.publish("gtmEvent", {
      event_name: eventName,
      video_provider: "youtube",
      video_status: status,
      video_url: url,
      video_title: title,
      video_duration: duration,
      video_current_time: currentTime,
      video_percent: percent,
    });
  };

  ["video:start", "video:progress", "video:complete"].forEach((type) =>
    body.addEventListener(type, handleVideoEvent)
  );
})();
