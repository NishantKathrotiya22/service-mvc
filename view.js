// view.js
// View: Handles UI rendering, DOM interactions, and display logic

// Render Functions
function parseDate(date) {
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  });
  const weekday = weekdayFormatter.format(date);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const d = new Date(date);

  if (isNaN(d.getTime())) {
    throw new Error("Invalid date input");
  }

  const referenceDate = new Date(2025, 8, 15);

  const timeDiff = d.getTime() - referenceDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  const quotient = Math.floor(daysDiff / 7);
  const modResult = ((quotient % 2) + 2) % 2;

  let parity = modResult + 1;

  let label = `${weekday} - ${day}-${month}-${year} (Week-${parity})`;

  const colorMap = {
    1: "#4F7AB3",
    2: "#225f27ff",
  };

  const color = colorMap[parity] || "#00000";

  return {
    html: `<div style="color: ${color}; padding: 4px 8px; border-radius: 4px;">${label}</div>`,
  };
}

function parseAndClean(input) {
  return input
    .split(/,|\n/) // Split by comma or newline
    .map((part) => part.replace(/:.*$/, "").trim())
    .join(", "); // Join back with comma and space
}

function renderTooltipContent(arg) {
  const agreementId = arg?.event?.extendedProps?.agreementBookingSetupId ?? "";

  return `
    <div class="custom-tooltip-content">
      <p class="event-desc-id">${new Date(
        arg.event.start
      ).toLocaleDateString()} - ${new Date(
    arg.event.end
  ).toLocaleDateString()}</p>
    
      <div class="event-desc-grid">
        <p>Address (Work Order)</p>
        <p>${arg.event.extendedProps.address}</p>

        <p>Service Type</p>
        <p>${parseAndClean(arg.event.extendedProps.servicesString)}</p>

        <p>Agreement Booking</p>
       
        <p 
          class="btn-link-style view-agreement-link" 
          data-agreement-id="${agreementId}"
        >
          View Agreement
        </p>
      </div>
    </div>
  `;
}

function renderStatusIcon(status, placeholder) {
  if (placeholder) {
    return `<svg width="20" height="20" viewBox="0 0 97 97" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="48.5" cy="48.5" r="48.5" fill="#B0B0B0"/>
                <g clip-path="url(#clip0_2663_617)">
                <path d="M64.0051 29.6131C62.5478 26.843 60.266 24.5349 57.4395 22.8607C54.6142 21.1939 51.2037 20.1761 47.5022 20.1761C42.9396 20.1648 39.1488 21.3535 36.2878 22.9998C33.4153 24.6401 32.1768 26.55 32.1768 26.55C31.6941 26.9689 31.4218 27.5783 31.4332 28.2158C31.4463 28.8542 31.7402 29.4534 32.2379 29.8515L36.2135 33.0358C37.0239 33.6846 38.1836 33.6602 38.9657 32.9784C38.9657 32.9784 39.4541 32.0958 40.9846 31.2215C42.5236 30.3529 44.519 29.6534 47.5022 29.644C50.1041 29.6383 52.3728 30.6093 53.9211 31.9361C54.6903 32.5934 55.2649 33.3295 55.617 34.0029C55.972 34.6818 56.1015 35.2752 56.0998 35.726C56.0922 37.2491 55.7964 38.2453 55.3692 39.0941C55.0434 39.728 54.6181 40.2905 54.0705 40.836C53.2535 41.653 52.1456 42.4079 50.9024 43.1018C49.6583 43.8042 48.3173 44.422 46.9623 45.1686C45.4157 46.025 43.7792 47.2551 42.5697 49.1012C41.9669 50.0139 41.4954 51.058 41.196 52.1594C40.8926 53.2619 40.7557 54.4178 40.7557 55.5972C40.7557 56.8554 40.7557 57.8883 40.7557 57.8883C40.7557 59.0743 41.7171 60.0358 42.9032 60.0358H48.077C49.2629 60.0358 50.2245 59.0743 50.2245 57.8883C50.2245 57.8883 50.2245 56.8554 50.2245 55.5972C50.2245 55.1427 50.2762 54.8498 50.326 54.6638C50.4115 54.3859 50.4594 54.3164 50.5993 54.1473C50.742 53.9867 51.0302 53.7408 51.5616 53.4468C52.3382 53.0103 53.5861 52.4206 54.9992 51.6571C57.1148 50.5003 59.6867 48.9303 61.8558 46.3395C62.9348 45.0466 63.8887 43.4896 64.547 41.6962C65.2109 39.9027 65.5695 37.8867 65.5677 35.726C65.5657 33.5371 64.9723 31.4581 64.0051 29.6131Z" fill="#E6E6E6"/>
                <path d="M45.4919 65.1448C42.2665 65.1448 39.6514 67.7608 39.6514 70.9853C39.6514 74.2089 42.2666 76.824 45.4919 76.824C48.7155 76.824 51.3296 74.2089 51.3296 70.9853C51.3296 67.7608 48.7155 65.1448 45.4919 65.1448Z" fill="#E6E6E6"/>
                </g>
                <defs>
                <clipPath id="clip0_2663_617">
                <rect width="56.648" height="56.648" fill="#E6E6E6" transform="translate(20.176 20.176)"/>
                </clipPath>
                </defs>
            </svg>`;
  }

  const icon = {
    690970001: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" color="#4F7AB3">
                <path
                    d="M15.3437 4.84375L16.5937 3.40625C16.8437 3.125 16.8125 2.65625 16.5313 2.40625C16.1875 2.15625 15.75 2.1875 15.5 2.5L14.1875 4.0625C13.1563 3.46875 11.9687 3.0625 10.7187 2.96875V1.9375H12.7188C13.0938 1.9375 13.4063 1.625 13.4063 1.25C13.4063 0.875 13.0938 0.5625 12.7188 0.5625H7.3125C6.9375 0.5625 6.625 0.875 6.625 1.25C6.625 1.625 6.9375 1.9375 7.3125 1.9375H9.3125V2.9375C5.0625 3.28125 1.71875 6.84375 1.71875 11.1875C1.71875 15.75 5.4375 19.4688 10 19.4688C14.5625 19.4688 18.2812 15.75 18.2812 11.1875C18.2812 8.65625 17.125 6.375 15.3437 4.84375ZM10 18.0625C6.21875 18.0625 3.125 14.9688 3.125 11.1875C3.125 7.40625 6.21875 4.3125 10 4.3125C13.7813 4.3125 16.875 7.40625 16.875 11.1875C16.875 14.9688 13.7813 18.0625 10 18.0625Z"
                    fill="currentColor" />
                <path
                    d="M10.6875 11.0625V7.4375C10.6875 7.0625 10.375 6.75 10 6.75C9.625 6.75 9.3125 7.0625 9.3125 7.4375V11.3437C9.3125 11.5312 9.375 11.7188 9.53125 11.8438L11.8438 14.1562C11.9688 14.2812 12.1563 14.375 12.3438 14.375C12.5313 14.375 12.7188 14.3125 12.8438 14.1562C13.125 13.875 13.125 13.4375 12.8438 13.1562L10.6875 11.0625Z"
                    fill="currentColor" />
            </svg>`,
    690970005: `<svg xmlns="http://www.w3.org/2000/svg" fill="#FA5252" viewBox="0 0 50 50" width="20px" height="20px">
                  <path d="M 25 2 C 12.309534 2 2 12.309534 2 25 C 2 37.690466 12.309534 48 25 48 C 37.690466 48 48 37.690466 48 25 C 48 12.309534 37.690466 2 25 2 z M 25 4 C 36.609534 4 46 13.390466 46 25 C 46 36.609534 36.609534 46 25 46 C 13.390466 46 4 36.609534 4 25 C 4 13.390466 13.390466 4 25 4 z M 32.990234 15.986328 A 1.0001 1.0001 0 0 0 32.292969 16.292969 L 25 23.585938 L 17.707031 16.292969 A 1.0001 1.0001 0 0 0 16.990234 15.990234 A 1.0001 1.0001 0 0 0 16.292969 17.707031 L 23.585938 25 L 16.292969 32.292969 A 1.0001 1.0001 0 1 0 17.707031 33.707031 L 25 26.414062 L 32.292969 33.707031 A 1.0001 1.0001 0 1 0 33.707031 32.292969 L 26.414062 25 L 33.707031 17.707031 A 1.0001 1.0001 0 0 0 32.990234 15.986328 z"/>
                </svg>`,
  };

  return icon[status] || " ";
}

function formatEventTime(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const parts = formatter.formatToParts(new Date(date));
  const formattedDate = parts
    .map((part) => {
      if (part.type === "timeZoneName") {
        return `(${part.value})`;
      }
      return part.value;
    })
    .join("")
    .replace(/,\s/, " ");

  return formattedDate;
}

function renderEventDetails(arg) {
  const start = new Date(arg.event.start);
  const end = new Date(arg.event.end);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  const durationStr = `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  arg.event.extendedProps.duration = durationStr;
  const tooltipHtml = renderTooltipContent(arg).replace(/\n/g, "");
  let eventClass = "ec-event-active";

  if (currentTab === "leave") {
    const resourceId = arg?.event?.resourceIds?.[0] ?? arg?.event?.id;
    eventClass = window.Model.getEventClassName(start, end, resourceId);
  }

  if (
    eventClass === "ec-event-active" &&
    arg?.event?.extendedProps?.placeholder
  ) {
    eventClass = "ec-event-placeholder";
  }

  return {
    html: `
        <div class='event-disp-container ${eventClass}'
        data-bs-toggle="tooltip"
        data-bs-html="true"
        data-bs-placement="bottom"
        data-popper-placement="left"
        data-bs-custom-class="custom-tooltip"
        data-bs-trigger="manual"
        title='${tooltipHtml}'>
        <div class="event-disp">
            <p>${arg?.event?.extendedProps?.employeeName}</p>
            <p>${arg.event.extendedProps.suburb || "N/A"}</p>
             <p>${
               serviceType[arg?.event?.extendedProps?.service_id] ?? "N/A"
             }</p>
            <p>${formatEventTime(start)} - ${
      arg.event.extendedProps.duration
    }</p> 
        </div>
        <div class="event-disp-icon">
            ${renderStatusIcon(
              arg?.event?.extendedProps?.workOrderStatus,
              arg?.event?.extendedProps?.placeholder
            )}
        </div>
      </div>
    `,
  };
}

function renderResources(info) {
  const resource = info?.resource;
  const props = info?.resource?.extendedProps;

  if (resource.id === "loading") {
    return {
      html: `<div class="person-details">
               <div class="person-info">
                 <h5>Loading...</h5>
               </div>
             </div>`,
    };
  }

  if (resource?.id === "error") {
    return {
      html: `<div class="person-details">
               <div class="person-info">
                 <h5 style="color:red;">Error loading resources</h5>
               </div>
             </div>`,
    };
  }

  if (!props || !props?.imgUrl || !props?.name) {
    return {
      html: `<div class="person-details">No Content</div>`,
    };
  }

  return {
    html: `<div class="person-details">
        <div class="profile-img">
          <img src="${info?.resource?.extendedProps?.imgUrl}" alt="">
        </div>
        <div class="person-info">   
          <h5>${info?.resource?.extendedProps?.name}</h5>
         
        </div>
      </div>`,
  };
}

// UI Rendering and Interactions
function renderDropdowns(options) {
  const regionLabel = document.querySelector(
    '[name="region-filter"] .value-display'
  );
  const worktypeLabel = document.querySelector(
    '[name="work-type-filter"] .value-display'
  );

  const regionDropdown = document.querySelector(
    '.custom-dropdown label[for="region-filter"]'
  ).nextElementSibling.nextElementSibling;

  const worktypeDropdown = document.querySelector(
    '.custom-dropdown label[for="work-type-filter"]'
  ).nextElementSibling.nextElementSibling;

  if (!regionDropdown || !worktypeDropdown) {
    console.error("❌ Could not find dropdown ULs");
    return;
  }

  const filterStatus = window.Model.getFilterStatus();

  if (filterStatus.isLoading) {
    regionLabel.textContent = "Loading...";
    worktypeLabel.textContent = "Loading...";
    return;
  }

  if (filterStatus.isError) {
    regionLabel.textContent = "Error loading options";
    worktypeLabel.textContent = "Error loading options";
    return;
  }

  regionLabel.textContent = filterStatus?.region?.length
    ? "Select an option"
    : "Options not found";

  worktypeLabel.textContent = filterStatus?.worktype?.length
    ? "Select an option"
    : "Options not found";

  regionDropdown.innerHTML = "";
  options.region.forEach((r) => {
    regionDropdown.insertAdjacentHTML(
      "beforeend",
      `<li class="dropdown-option"><input type="checkbox" value="${r?.territoryid}" /> ${r?.name}</li>`
    );
  });

  worktypeDropdown.innerHTML = "";
  options.worktype.forEach((w) => {
    worktypeDropdown.insertAdjacentHTML(
      "beforeend",
      `<li class="dropdown-option"><input type="checkbox" value="${w.bookableresourcecategoryid}" /> ${w.name}</li>`
    );
  });
}

function setupFilterDropdownsAndReset() {
  const filterState = window.Model.getFilterState();
  filterState.region = [];
  filterState.worktype = [];

  function setupMultiSelect(dropdownSelector, filterKey) {
    const dropdown = document.querySelector(dropdownSelector).parentElement;
    const listItems = dropdown.querySelectorAll(".dropdown-option");
    const valueDisplay = dropdown.querySelector(".value-display");

    listItems.forEach((li) => {
      const checkbox = li.querySelector("input[type='checkbox']");
      const value = checkbox.value.trim();

      li.addEventListener("click", function (e) {
        if (e.target.tagName.toLowerCase() !== "input") {
          checkbox.checked = !checkbox.checked;
        }

        if (checkbox.checked) {
          if (!filterState[filterKey].includes(value)) {
            filterState[filterKey].push(value);
          }
          e.target.classList.add("selected-option");
        } else {
          filterState[filterKey] = filterState[filterKey].filter(
            (v) => v !== value
          );
          e.target.classList.remove("selected-option");
        }

        if (filterState[filterKey].length > 0) {
          valueDisplay.textContent = `${filterState[filterKey].length} item(s) selected`;
        } else {
          valueDisplay.textContent = "Select an option";
        }

        // Notify controller to apply filters
        if (window.Controller) window.Controller.applyFilters();
      });
    });
  }

  setupMultiSelect('.custom-dropdown label[for="region-filter"]', "region");
  setupMultiSelect(
    '.custom-dropdown label[for="work-type-filter"]',
    "worktype"
  );

  const resetBtn = document.getElementById("reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      // Removes From UI
      resetFilterUI();
      // Clears State
      if (window.Controller) window.Controller.resetFilters();
    });
  }
}

function resetFilterUI() {
  // Uncheck all checkboxes
  document
    .querySelectorAll(".custom-dropdown input[type='checkbox']")
    .forEach((cb) => (cb.checked = false));

  document
    .querySelectorAll(".dropdown-option")
    .forEach((cb) => cb.classList.remove("selected-option"));

  document
    .querySelectorAll(".value-display")
    .forEach((vd) => (vd.textContent = "Select an option"));

  const searchInput = document.querySelector(".search-input");
  if (searchInput) searchInput.value = "";

  $(".starttime").timepicker("setTime", "6:00 AM");
  $(".endtime").timepicker("setTime", "6:00 PM");

  // Reset dynamic heights before applying filters
  resetDynamicHeight();
}

function renderSearch() {
  const sidebarTitle = document.querySelector(".ec-sidebar-title");
  if (!sidebarTitle) return;

  const searchContainer = document.createElement("div");
  searchContainer.classList.add("search-container");

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.name = "search-input";
  searchInput.placeholder = "Search resources";
  searchInput.classList.add("search-input");

  const searchIcon = document.createElement("img");
  searchIcon.src = "..//WebResources/sog_search";
  searchIcon.alt = "Search";
  searchIcon.classList.add("search-icon");

  const sortBtn = document.createElement("button");
  const sortIcon = document.createElement("img");
  sortIcon.src = "..//WebResources/sog_swap";
  sortIcon.alt = "Sort";
  sortBtn.classList.add("sort-btn");
  sortBtn.appendChild(sortIcon);

  searchContainer.appendChild(searchIcon);
  searchContainer.appendChild(searchInput);

  sidebarTitle.appendChild(searchContainer);
  sidebarTitle.appendChild(sortBtn);

  const debouncedFilter = (event) => {
    const filterState = window.Model.getFilterState();
    window.Model.setFilterState(
      "search",
      event.target.value.trim().toLowerCase()
    );
    if (window.Controller) window.Controller.applyFilters();
  };

  // Simple debounce implementation
  let timer;
  searchInput.addEventListener("keyup", (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => debouncedFilter(e), 300);
  });

  sortBtn.addEventListener("click", () => {
    const filterState = window.Model.getFilterState();
    window.Model.setFilterState("sortAsc", !filterState.sortAsc);
    if (window.Controller) window.Controller.applyFilters();
  });
}

function resizableBar() {
  const sidebar = document.querySelector(".ec-sidebar");

  if (sidebar && !sidebar.querySelector(".drag-resize")) {
    const resizer = document.createElement("div");
    resizer.classList.add("drag-resize");
    sidebar.appendChild(resizer);

    resizer.addEventListener("mousedown", function (e) {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebar.offsetWidth;
      sidebar.style.width = 200 + "px";

      function onMouseMove(e) {
        const newWidth = startWidth + (e.clientX - startX);
        if (newWidth >= 200 && newWidth <= 540) {
          sidebar.style.width = newWidth + "px";
        }
      }

      function onMouseUp() {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }
}

function syncDynamicHeight() {
  const dayContainers = document.querySelectorAll(
    ".ec-content > .ec-days:last-child > .ec-day > .ec-events"
  );
  const target = document.querySelector(
    ".ec-resource:last-child .person-details"
  );
  const ecDaysLast = document.querySelector(
    ".ec-content > .ec-days:last-child"
  );
  const ecResourceLast = document.querySelector(".ec-resource:last-child");
  const ecDays = document.querySelectorAll(
    ".ec-content > .ec-days:last-child > .ec-day"
  );

  if (
    dayContainers.length &&
    target &&
    ecDaysLast &&
    ecResourceLast &&
    ecDays.length
  ) {
    let maxOffsetTop = 0;

    dayContainers.forEach((eventsContainer) => {
      const events = eventsContainer.querySelectorAll(".ec-event");

      events.forEach((ev) => {
        const eventTop = ev.offsetTop;
        if (eventTop > maxOffsetTop) {
          maxOffsetTop = eventTop;
        }
      });
    });

    const finalTop = maxOffsetTop == 0 ? 80 : maxOffsetTop + 85;
    target.style.height = finalTop + "px";
    ecDaysLast.style.setProperty("--bor-top", `${finalTop}px`);
    ecResourceLast.style.setProperty("--bor-top", `${finalTop}px`);

    ecDays.forEach((ecDay) => {
      ecDay.style.height = `${finalTop}px`;
    });
  } else {
    console.warn("syncDynamicHeight: Required elements not found.");
  }
}

function resetDynamicHeight() {
  const target = document.querySelector(
    ".ec-resource:last-child .person-details"
  );
  const ecDaysLast = document.querySelector(
    ".ec-content > .ec-days:last-child"
  );
  const ecResourceLast = document.querySelector(".ec-resource:last-child");
  const ecDays = document.querySelectorAll(
    ".ec-content > .ec-days:last-child > .ec-day"
  );

  if (target) {
    target.style.height = "";
  }

  if (ecDaysLast) {
    ecDaysLast.style.removeProperty("--bor-top");
  }

  if (ecResourceLast) {
    ecResourceLast.style.removeProperty("--bor-top");
  }

  ecDays.forEach((ecDay) => {
    ecDay.style.height = "";
  });
}

function disposeAllTooltips() {
  const tooltipElements = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
  tooltipElements.forEach((el) => {
    const instance = bootstrap.Tooltip.getInstance(el);
    if (instance) instance.dispose();
  });
}

function initializeAllTooltips() {
  disposeAllTooltips();

  const tooltipElements = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
  tooltipElements.forEach((el) => {
    const existing = bootstrap.Tooltip.getInstance(el);
    if (existing) existing.dispose();

    const defaultAllowList = bootstrap.Tooltip.Default.allowList;

    new bootstrap.Tooltip(el, {
      container: ".ec-body",
      boundary: "clippingParents",
      fallbackPlacements: ["top", "bottom", "left", "right"],
      html: true,
      allowList: {
        ...defaultAllowList,
        p: ["class", "data-agreement-id"],
      },
    });
  });
}

function handleTooltipClick(e) {
  const link = e.target.closest(".view-agreement-link");
  if (!link) return;

  e.preventDefault();
  const id = link.getAttribute("data-agreement-id");

  const tooltipId = link.closest(".tooltip")?.id;
  if (!tooltipId) return;

  const tooltipTriggerEl = document.querySelector(
    `[aria-describedby="${tooltipId}"]`
  );

  if (id) {
    openAgreementBookingSetupRecord(id);
  } else {
    console.warn("Attempted to open agreement with no ID.");
  }

  if (tooltipTriggerEl) {
    const tooltipInstance = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
    if (tooltipInstance) {
      tooltipInstance.hide();
    }
  }
}

let boundTooltipClickHandler = handleTooltipClick.bind(this);

function applyBtn() {
  document.removeEventListener("click", boundTooltipClickHandler);
  document.addEventListener("click", boundTooltipClickHandler);
}

function tooltipObserver() {
  let hideTimer;
  let activeTooltip = null;

  $(document).on("mouseenter", ".event-disp-container", function () {
    clearTimeout(hideTimer);

    if (activeTooltip && activeTooltip !== this) {
      const oldTooltip = bootstrap.Tooltip.getInstance(activeTooltip);
      if (oldTooltip) oldTooltip.hide();
    }

    const tooltip =
      bootstrap.Tooltip.getInstance(this) || new bootstrap.Tooltip(this);
    tooltip.show();
    activeTooltip = this;
  });

  $(document).on("mouseleave", ".event-disp-container", function () {
    const tooltipInstance = bootstrap.Tooltip.getInstance(this);
    if (tooltipInstance) {
      hideTimer = setTimeout(() => {
        const tooltipEl = document.querySelector(".tooltip:hover");
        if (!tooltipEl) {
          tooltipInstance.hide();
          if (activeTooltip === this) activeTooltip = null;
        }
      }, 100);
    }
  });

  $(document).on("mouseenter", ".tooltip", function () {
    clearTimeout(hideTimer);
  });

  $(document).on("mouseleave", ".tooltip", function () {
    hideTimer = setTimeout(() => {
      const tooltips = document.querySelectorAll(".tooltip");
      tooltips.forEach((tooltipEl) => {
        const triggerElement = document.querySelector(
          `[aria-describedby="${tooltipEl.id}"]`
        );
        if (triggerElement) {
          const tooltip = bootstrap.Tooltip.getInstance(triggerElement);
          if (tooltip) tooltip.hide();
        }
      });
      activeTooltip = null;
    }, 100);
  });
}

function applyObserver() {
  const scrollContainer = document.querySelector(".ec-header");
  const dayHeads = document.querySelectorAll(".ec-day-head");

  function updatePosition() {
    const containerRect = scrollContainer.getBoundingClientRect();

    dayHeads.forEach((head) => {
      const labelDiv = head.querySelector("time > div");
      if (!labelDiv) return;

      const headRect = head.getBoundingClientRect();

      if (
        headRect.right > containerRect.left &&
        headRect.left < containerRect.right
      ) {
        const offset = Math.max(0, containerRect.left - headRect.left);
        labelDiv.style.transform = `translateX(${offset}px)`;
      } else {
        labelDiv.style.transform = "translateX(0px)";
      }
    });
  }

  scrollContainer.addEventListener("scroll", updatePosition);
  updatePosition();
}

function refreshCalendarUI() {
  initializeAllTooltips();
  syncDynamicHeight();
  applyObserver();
}

function openAgreementBookingSetupRecord(id) {
  var pageInput = {
    pageType: "entityrecord",
    entityName: "msdyn_agreementbookingsetup",
    entityId: id,
  };
  var navigationOptions = {
    target: 2,
    height: { value: 90, unit: "%" },
    width: { value: 90, unit: "%" },
    position: 1,
  };
  window.parent.Xrm.Navigation.navigateTo(pageInput, navigationOptions).then(
    function success() {},
    function error() {}
  );
}

// Custom Dropdown (from Interaction.js)
function initCustomDropdowns() {
  var dropdowns = document.querySelectorAll(".custom-dropdown");
  if (dropdowns.length) {
    document.addEventListener("click", function (e) {
      dropdowns.forEach(function (dropdown) {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove("open");
        }
      });
    });

    dropdowns.forEach(function (dropdown) {
      var disp = dropdown.querySelector(".value-display");
      var selected = dropdown.querySelector(".dropdown-selected");
      var options = dropdown.querySelectorAll(".dropdown-option");
      if (selected) {
        selected.addEventListener("click", function (e) {
          e.stopPropagation();

          dropdowns.forEach(function (dd) {
            if (dd !== dropdown) {
              dd.classList.remove("open");
            }
          });

          dropdown.classList.toggle("open");
        });
      }
      options.forEach(function (option) {
        option.addEventListener("click", function (e) {
          e.stopPropagation();
          if (disp) disp.textContent = option.textContent;
          dropdown.classList.remove("open");
        });
      });
    });
  }
}

// Filter Panel Toggle (from Interaction.js)
function initFilterPanel() {
  var gridContainerEl = document.querySelector(".grid-container");
  var filterBtn = document.querySelector("#filter-btn");
  var filterClose = document.querySelector("#filter-close");
  var ecHolderEl = document.querySelector(".ec-holder");

  if (filterBtn && gridContainerEl) {
    filterBtn.addEventListener("click", function () {
      gridContainerEl.classList.toggle("hide-filter");
    });
  }

  if (filterClose && gridContainerEl) {
    filterClose.addEventListener("click", function () {
      gridContainerEl.classList.add("hide-filter");
    });
  }
}

// Date Range Picker and Navigation (from Interaction.js)
function initDateRangePicker() {
  if (typeof $ !== "undefined" && typeof $.fn.daterangepicker !== "undefined") {
    $(function () {
      var $dateInput = $('input[name="datefilter"]');
      if ($dateInput.length) {
        $dateInput.daterangepicker({
          autoUpdateInput: true,
          locale: {
            cancelLabel: "Cancel",
            format: "DD/MM/YYYY",
          },
          startDate: moment(),
          endDate: moment(),
          applyButtonClasses: "date-apply-btn",
          cancelButtonClasses: "date-cancel-btn",
        });

        $dateInput.on("apply.daterangepicker", function (ev, picker) {
          $(this).val(
            picker.startDate.format("DD/MM/YYYY") +
              " - " +
              picker.endDate.format("DD/MM/YYYY")
          );

          if (window.ecCalendar) {
            var start = picker.startDate.clone().startOf("day");
            var end = picker.endDate.clone().startOf("day");

            var calendarDuration = getCalendarDuration(start, end);
            window.ecCalendar.setOption("date", start.toDate());
            window.ecCalendar.setOption("duration", { days: calendarDuration });

            // if (window.Controller) window.Controller.handleDateChange();
          }
        });
      }
    });
  } else {
    console.warn("jQuery or daterangepicker not loaded.");
  }

  $("#calPrev").on("click", function () {
    const picker = $('input[name="datefilter"]').data("daterangepicker");
    if (!picker) return;

    const rangeDays = picker.endDate.diff(picker.startDate, "days");
    const newStart = picker.startDate.clone().subtract(rangeDays + 1, "days");
    const newEnd = picker.endDate.clone().subtract(rangeDays + 1, "days");

    picker.setStartDate(newStart);
    picker.setEndDate(newEnd);

    $('input[name="datefilter"]').val(
      `${newStart.format("DD/MM/YYYY")} - ${newEnd.format("DD/MM/YYYY")}`
    );

    $('input[name="datefilter"]').trigger("apply.daterangepicker", [picker]);
  });

  $("#calNext").on("click", function () {
    const picker = $('input[name="datefilter"]').data("daterangepicker");
    if (!picker) return;

    const rangeDays = picker.endDate.diff(picker.startDate, "days");
    const newStart = picker.startDate.clone().add(rangeDays + 1, "days");
    const newEnd = picker.endDate.clone().add(rangeDays + 1, "days");

    picker.setStartDate(newStart);
    picker.setEndDate(newEnd);

    $('input[name="datefilter"]').val(
      `${newStart.format("DD/MM/YYYY")} - ${newEnd.format("DD/MM/YYYY")}`
    );

    $('input[name="datefilter"]').trigger("apply.daterangepicker", [picker]);
  });

  var todayBtn = document.getElementById("today-btn");
  if (todayBtn) {
    todayBtn.addEventListener("click", function () {
      var today = moment();

      if (window.ecCalendar) {
        window.ecCalendar.setOption("date", new Date());
        window.ecCalendar.setOption("duration", { days: 8 });
      }

      if (
        typeof $ !== "undefined" &&
        typeof $.fn.daterangepicker !== "undefined"
      ) {
        var $dateInput = $('input[name="datefilter"]');
        if ($dateInput.length && $dateInput.data("daterangepicker")) {
          $dateInput.data("daterangepicker").setStartDate(today);
          $dateInput.data("daterangepicker").setEndDate(today);
          $dateInput.val(
            today.format("DD/MM/YYYY") + " - " + today.format("DD/MM/YYYY")
          );
        }
      }
      // if (window.Controller) window.Controller.handleDateChange();
    });
  }
}

function getCalendarDuration(startDate, endDate) {
  const selectedDays = endDate.diff(startDate, "days") + 1;
  return Math.max(8, selectedDays);
}

function formatTo24HourTime(dateObj) {
  const pad = (n) => String(n).padStart(2, "0");
  const hours = pad(dateObj.getHours());
  const minutes = pad(dateObj.getMinutes());
  const seconds = pad(dateObj.getSeconds());
  return `${hours}:${minutes}:${seconds}`;
}

// Time Pickers (from Interaction.js)
function initTimePickers() {
  $(".starttime").timepicker({
    timeFormat: "h:mm p",
    interval: 30,
    startTime: "00:00",
    defaultTime: "6:00",
    dynamic: false,
    dropdown: true,
    scrollbar: true,

    change: function (time) {
      const previousStart = $(this).data("previousTime");
      if (previousStart === undefined) {
        $(this).data("previousTime", time);
        $(this).data("currentTime", time);
        const fullTime = formatTo24HourTime(time);
        if (window?.ecCalendar) {
          window.ecCalendar.setOption("slotMinTime", fullTime);
          setTimeout(() => {
            refreshCalendarUI();
          }, 0);
        }
        return;
      }
      const endTime = $(".endtime").data("currentTime");
      if (endTime && time.getTime() >= endTime.getTime() - 60 * 59 * 1000) {
        $(this).timepicker("setTime", previousStart, { trigger: false });
        return;
      }
      $(this).data("previousTime", time);
      $(this).data("currentTime", time);
      const fullTime = formatTo24HourTime(time);
      if (window?.ecCalendar) {
        window.ecCalendar.setOption("slotMinTime", fullTime);
        setTimeout(() => {
          refreshCalendarUI();
        }, 0);
      }
    },
  });

  $(".endtime").timepicker({
    timeFormat: "h:mm p",
    interval: 30,
    startTime: "24:00",
    defaultTime: "18",
    dynamic: false,
    dropdown: true,
    scrollbar: true,

    change: function (time) {
      const previousEnd = $(this).data("previousTime");
      if (previousEnd === undefined) {
        $(this).data("previousTime", time);
        $(this).data("currentTime", time);
        const fullTime = formatTo24HourTime(time);
        if (window?.ecCalendar) {
          window.ecCalendar.setOption("slotMaxTime", fullTime);
        }
        return;
      }
      const startTime = $(".starttime").data("currentTime");
      if (startTime && time.getTime() <= startTime.getTime() + 60 * 59 * 1000) {
        $(this).timepicker("setTime", previousEnd, { trigger: false });
        return;
      }
      $(this).data("previousTime", time);
      $(this).data("currentTime", time);
      const fullTime = formatTo24HourTime(time);
      if (window?.ecCalendar) {
        window.ecCalendar.setOption("slotMaxTime", fullTime);
      }
    },
  });

  $(".time-container img").on("click", function (e) {
    // Fixed typo: conatainer -> container
    e.preventDefault();
    e.stopPropagation();

    const $input = $(this).siblings("input.starttime, input.endtime");

    setTimeout(() => {
      $input.focus();
    }, 10);
  });
}

// Tab Switching UI
function chnageActivetab() {
  const initalTabBtn = document.getElementById("intial-tab-btn");
  const leaveTabBtn = document.getElementById("leave-tab-btn");

  initalTabBtn.addEventListener("click", (el) => {
    initalTabBtn.children[0].classList.add("active-tab-btn");
    leaveTabBtn.children[0].classList.remove("active-tab-btn");
    currentTab = "init";
    if (window.Controller) window.Controller.switchTab("init");
  });

  leaveTabBtn.addEventListener("click", (el) => {
    leaveTabBtn.children[0].classList.add("active-tab-btn");
    initalTabBtn.children[0].classList.remove("active-tab-btn");
    currentTab = "leave";
    if (window.Controller) window.Controller.switchTab("leave");
  });
}

// Refresh Button UI
function initRefreshBtn() {
  const refreshBtn = document.getElementById("refresh-btn");

  refreshBtn.addEventListener("click", (el) => {
    if (window.Controller) window.Controller.refreshData();
  });
}

// Calendar Creation
function createCalendar() {
  const ecEl = document.getElementById("ec");

  if (!ecEl || typeof EventCalendar === "undefined") {
    console.error("Calendar container or EventCalendar library not found.");
    return;
  }

  const ec = EventCalendar.create(ecEl, {
    view: "resourceTimelineDay",
    initialView: "resourceTimelineDay",
    slotWidth: "220",
    slotHeight: "80",
    duration: { days: 10 },
    headerToolbar: false,
    editable: false,
    durationEditable: false,
    eventStartEditable: false,
    slotEventOverlap: true,
    highlightedDates: window.Model.getHolidayDates(),

    dayHeaderFormat: parseDate,
    eventContent: renderEventDetails,
    resourceLabelContent: renderResources,
    viewDidMount: () => {
      renderSearch();
      resizableBar();
    },
    eventAllUpdated: refreshCalendarUI,
    datesSet: () => {
      if (window.Controller) window.Controller.handleDateChange();
    },

    slotMinTime: "6:00:00",
    slotMaxTime: "18:00:00",
  });
  window.ecCalendar = ec;
  applyBtn();
}

// Expose view functions for controller
window.View = {
  createCalendar,
  renderDropdowns,
  setupFilterDropdownsAndReset,
  resetFilterUI,
  initCustomDropdowns,
  initFilterPanel,
  initDateRangePicker,
  initTimePickers,
  chnageActivetab,
  initRefreshBtn,
  tooltipObserver,
  refreshCalendarUI,
  resetDynamicHeight,
  syncDynamicHeight,
  disposeAllTooltips,
  initializeAllTooltips,
  applyObserver,
  reRenderEvents: () => {
    if (window.ecCalendar) {
      window.ecCalendar.setOption("events", window.Model.getEvents());
    }
  },
  reRenderResources: (resources) => {
    if (window.ecCalendar) {
      window.ecCalendar.setOption("resources", resources);
    }
  },
};
