// controller.js
// Controller: Coordinates Model and View, handles events and state updates

let __suppressDateChangeOnce = false;

// Initialization
async function init() {
  console.log("Initialization Called");
  try {
    // 1. First load holiday dates
    await window.Model.loadHolidayDates();

    // 2. Initialize calendar
    window.View.createCalendar();

    // 3. Initialize UI components
    window.View.initCustomDropdowns();
    window.View.initFilterPanel();
    window.View.initDateRangePicker();
    window.View.initTimePickers();
    window.View.chnageActivetab();
    window.View.initRefreshBtn();
    window.View.tooltipObserver();

    // 4. First ensure bookableResourceCategoryHandler completes to get calendar IDs
    await window.Model.bookableResourceCategoryHandler();

    // 5. Then load other data in parallel
    await Promise.all([
      getServiceType().then((data) => {
        serviceType = window.Model.mapServiceType(data);
      }),
      handleFilterFetch(),
    ]);

    // 6. Set global references and switch tab
    currentTab = "init";
    // Suppress the datesSet-triggered handleDateChange once during initial switch
    __suppressDateChangeOnce = true;
    await switchTab("init");
    window.refreshCalendarUI = window.View.refreshCalendarUI;
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

async function switchTab(tab) {
  console.log("Switch Tab Called", tab);
  try {
    currentTab = tab;
    // Reset filters without triggering immediate render; we'll render after all fetches complete
    window.Model.resetFilterState();
    window.View.resetFilterUI();
    window.View.resetDynamicHeight();
    window.Model.resetState();

    // Cancel any in-progress fetches
    window.Model.resetEventFetchFlags();

    if (tab === "init") {
      // Ensure calendar view date change does not trigger duplicate fetch
      __suppressDateChangeOnce = true;
      // 1. Fetch resources (shows loading state inside Model)
      await window.Model.handleGetResorces(
        getBookableResources,
        mapOverIntialData
      );

      // Create the Work hour pattern lookup
      await window.Model.buildResourcePatterns();

      // 2. Fetch events (this waits for any calendar batch work if needed)
      await window.Model.handleEventFetch();

      // 3. Render resources and events together
      const filteredResources = window.Model.applyAllFilters();
      window.View.reRenderResources(filteredResources);
      window.View.reRenderEvents();
      window.View.refreshCalendarUI();
      window.View.hideHolidays();
      window.View.addPurpleColor();
    } else if (tab === "leave") {
      // Ensure calendar view date change does not trigger duplicate fetch
      __suppressDateChangeOnce = true;
      window.View.removePurpleColor();
      // For leave tab, we can load resources and time off data in parallel
      const [resources, timeOffData] = await Promise.all([
        window.Model.handleGetResorces(getBookableResources, mapOverIntialData),
        window.Model.handleGetTimeoffWithoutSet(
          getTimeOffRequests,
          mapOverLeaveData
        ),
      ]);

      // Build lookups and then fetch events
      window.Model.calculateLookupData(timeOffData);
      await window.Model.handleEventFetch();

      // Update UI
      const filteredResources = window.Model.applyAllFilters();
      window.View.reRenderResources(filteredResources);
      window.View.reRenderEvents();
      window.View.refreshCalendarUI();
      window.View.showHolidays();
    }
  } catch (error) {
    console.error(`Error switching to ${tab} tab:`, error);
    const resorcesState = window.Model.getResorcesState();
    resorcesState.isLoading = false;
    resorcesState.isError = true;
    window.View.reRenderResources([
      { id: "error", title: "Error loading resources" },
    ]);
  }
}

function applyFilters() {
  window.View.resetDynamicHeight();
  const filteredResources = window.Model.applyAllFilters();
  window.View.reRenderResources(filteredResources);
  setTimeout(() => {
    window.View.refreshCalendarUI();
  }, 0);
}

function resetFilters() {
  window.Model.resetFilterState();
  window.View.resetFilterUI();
  const filteredResources = window.Model.applyAllFilters();
  window.View.reRenderResources(filteredResources);
  setTimeout(() => {
    window.View.refreshCalendarUI();
  }, 0);
}

async function handleDateChange() {
  try {
    if (__suppressDateChangeOnce) {
      // Skip one automatic date-change fetch triggered by view lifecycle
      __suppressDateChangeOnce = false;
      return;
    }
    if (currentTab === "leave") {
      const [timeOffData] = await Promise.all([
        window.Model.handleGetTimeoffWithoutSet(
          getTimeOffRequests,
          mapOverLeaveData
        ),
      ]);

      window.Model.calculateLookupData(timeOffData);

      await window.Model.handleEventFetch();
      window.View.reRenderEvents();
    } else {
      await window.Model.handleEventFetch();
      window.View.reRenderEvents();
    }

    window.View.refreshCalendarUI();
  } catch (error) {
    console.error("Error in date change:", error);
    const resorcesState = window.Model.getResorcesState();
    resorcesState.isLoading = false;
    resorcesState.isError = true;
    window.View.reRenderResources([
      { id: "error", title: "Error loading data" },
    ]);
  }
}

async function refreshData() {
  try {
    window.Model.resetEventFetchFlags(); // Reset event fetch flags when refreshing
    await window.Model.bookableResourceCategoryHandler();

    if (currentTab === "init") {
      await window.Model.handleGetResorces(
        getBookableResources,
        mapOverIntialData
      );
      await window.Model.buildResourcePatterns();
      await window.Model.handleEventFetch();

      const filteredResources = window.Model.applyAllFilters();
      window.View.reRenderResources(filteredResources);
      window.View.reRenderEvents();
    } else if (currentTab === "leave") {
      await window.Model.handleGetResorces(
        getBookableResources,
        mapOverIntialData
      );

      const [timeOffData] = await Promise.all([
        window.Model.handleGetTimeoffWithoutSet(
          getTimeOffRequests,
          mapOverLeaveData
        ),
      ]);

      window.Model.calculateLookupData(timeOffData);

      await window.Model.handleEventFetch();

      const filteredResources = window.Model.applyAllFilters();
      window.View.reRenderResources(filteredResources);
      window.View.reRenderEvents();
    }

    window.View.refreshCalendarUI();
  } catch (error) {
    console.error("Error refreshing data:", error);
    const resorcesState = window.Model.getResorcesState();
    resorcesState.isLoading = false;
    resorcesState.isError = true;
    window.View.reRenderResources([
      { id: "error", title: "Error loading resources" },
    ]);
  }
}

async function handleFilterFetch() {
  try {
    // Show loading state first
    window.View.renderDropdowns({ region: [], worktype: [] });

    const options = await window.Model.handleFilterFetch();
    window.View.renderDropdowns(options);
    window.View.setupFilterDropdownsAndReset();
  } catch (error) {
    console.error("Error fetching filter data:", error);
    // Show error state
    window.View.renderDropdowns({ region: [], worktype: [] });
  }
}

// Init on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Expose controller
window.Controller = {
  switchTab,
  applyFilters,
  resetFilters,
  handleDateChange,
  refreshData,
  handleFilterFetch,
};
