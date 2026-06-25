(() => {
  /**
   * Dynamically loads the YouTube Iframe API if not already loaded.
   */
  const loadYouTubeAPI = () => {
    if (typeof YT === "undefined" || typeof YT.Player === "undefined") {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(script, firstScriptTag);
    }
  };

  /**
   * Returns a promise that resolves when the YouTube API is ready.
   */
  const getYouTubeReady = () => {
    return (
      window.youTubeReady ||
      new Promise((resolve) => {
        window.onYouTubeIframeAPIReady = () => resolve();
      })
    );
  };

  /**
   * Extracts the YouTube video ID from a URL.
   * @param {string} url - The YouTube URL.
   * @returns {string|false} - The video ID or false if not found.
   */
  const extractYouTubeVideoId = (url) => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : false;
  };

  /**
   * Creates a function that checks video progress and dispatches events
   * when certain percentage thresholds are reached.
   *
   * @function makeProgressChecker
   * @param {YT.Player} player - The YouTube Player instance.
   * @param {string} url - The video URL.
   * @param {string} title - The video title.
   * @param {Set<number>} reachedSet - A set tracking reached percentage thresholds.
   * @returns {Function} Function to be called periodically to check progress.
   */
  const makeProgressChecker = (player, url, title, reachedSet) => () => {
    const duration = Math.floor(player.getDuration());
    const currentTime = Math.floor(player.getCurrentTime());
    if (!duration || duration < 1) return; // avoid divide-by-zero
    const percentNow = Math.floor((currentTime / duration) * 100);

    [10, 25, 50, 75].forEach((threshold) => {
      if (percentNow >= threshold && !reachedSet.has(threshold)) {
        reachedSet.add(threshold);
        document.body.dispatchEvent(
          new CustomEvent("video:progress", {
            bubbles: true,
            detail: {
              url,
              title,
              duration,
              currentTime,
              percent: threshold,
            },
          })
        );
      }
    });
  };

  /**
   * Initializes the YouTube modal functionality.
   */
  const initYouTubeModal = () => {
    const modal = document.getElementById("video-modal");
    if (!modal) return;

    const iframeWrapper = modal.querySelector(".video-modal__iframe-wrapper");
    const closeButton = modal.querySelector("[data-modal-close]");
    const triggers = document.querySelectorAll("[data-video-trigger]");

    const youtubeVideoOptions = {
      height: "480",
      width: "850",
      playerVars: {
        autohide: 0,
        autoplay: 1,
        branding: 0,
        cc_load_policy: 0,
        controls: 0,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        quality: "hd720",
        rel: 0,
        showinfo: 0,
        wmode: "opaque",
      },
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", async (event) => {
        event.preventDefault();
        await getYouTubeReady();

        const videoUrl = trigger.getAttribute("data-video-url");
        const videoId = extractYouTubeVideoId(videoUrl);

        if (!videoId) {
          return;
        }

        iframeWrapper.innerHTML = ""; // Clear previous iframe/player

        let progressInterval = null;
        let videoStarted = false;
        let videoCompleted = false;
        const reached = new Set();

        const playerConfig = {
          ...youtubeVideoOptions,
          videoId: videoId,
          events: {
            onStateChange: (e) => {
              const player = e.target;
              const data = e.data;
              const url = player.getVideoUrl?.() || videoUrl;
              const vd = player.getVideoData?.() || {};
              const title = vd.title || "";
              const duration = Math.floor(player.getDuration?.() || 0);

              if (data === YT.PlayerState.PLAYING) {
                modal.setAttribute("playing", "");

                if (!videoStarted) {
                  videoStarted = true;
                  document.body.dispatchEvent(
                    new CustomEvent("video:start", {
                      bubbles: true,
                      detail: {
                        url,
                        title,
                        duration,
                        currentTime: 0,
                        percent: 0,
                      },
                    })
                  );
                }

                if (!videoCompleted && !progressInterval) {
                  const check = makeProgressChecker(
                    player,
                    url,
                    title,
                    reached
                  );
                  progressInterval = setInterval(check, 1000);
                }
              } else if (data === YT.PlayerState.PAUSED) {
                modal.removeAttribute("playing");
                if (progressInterval) {
                  clearInterval(progressInterval);
                  progressInterval = null;
                }
              } else if (data === YT.PlayerState.ENDED) {
                modal.removeAttribute("playing");
                if (progressInterval) {
                  clearInterval(progressInterval);
                  progressInterval = null;
                }

                if (!videoCompleted) {
                  videoCompleted = true;
                  const d = Math.floor(player.getDuration?.() || duration || 0);
                  document.body.dispatchEvent(
                    new CustomEvent("video:complete", {
                      bubbles: true,
                      detail: {
                        url,
                        title,
                        duration: d,
                        currentTime: d,
                        percent: 100,
                      },
                    })
                  );
                }
              }
            },
          },
        };

        const player = new YT.Player(iframeWrapper, playerConfig);

        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");

        /**
         * Closes the modal and cleans up the player and body classes.
         *
         * @function closeModal
         * @returns {void}
         */
        const closeModal = () => {
          modal.classList.add("hidden");
          modal.setAttribute("aria-hidden", "true");
          document.body.classList.add("modal-closing");
          document.body.classList.remove("modal-open");

          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }

          setTimeout(() => {
            if (player && typeof player.destroy === "function") {
              player.destroy();
            }
            iframeWrapper.innerHTML = "";
            document.body.classList.remove("modal-closing");
          }, 500); // Match modal close transition
        };

        // Close modal on close button click
        closeButton.addEventListener("click", closeModal, { once: true });

        // Close modal on overlay click
        modal.addEventListener(
          "click",
          (e) => {
            if (e.target === modal) {
              closeModal();
            }
          },
          { once: true }
        );

        // Close modal on Escape key press
        document.addEventListener(
          "keydown",
          (e) => {
            if (e.key === "Escape") {
              closeModal();
            }
          },
          { once: true }
        );
      });
    });
  };

  // Execute initialization
  loadYouTubeAPI();
  window.youTubeReady = getYouTubeReady();
  initYouTubeModal();
})();
