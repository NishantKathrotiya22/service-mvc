// controller.js
// Controller: Coordinates Model and View, handles events and state updates

// Initialization
async function init() {
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

    // 4. Load all required data
    await Promise.all([
      window.Model.bookableResourceCategoryHandler(),
      getServiceType().then((data) => {
        serviceType = window.Model.mapServiceType(data);
      }),
      handleFilterFetch(),
    ]);

    // 5. Set global references
    currentTab = "init";
    await switchTab("init");
    window.refreshCalendarUI = window.View.refreshCalendarUI;
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

async function switchTab(tab) {
  try {
    currentTab = tab;
    resetFilters();
    window.View.resetDynamicHeight();

    // Cancel any in-progress fetches
    window.Model.resetEventFetchFlags();

    if (tab === "init") {
      // Fetch resources + events together
      const [resources] = await Promise.all([
        window.Model.handleGetResorces(getBookableResources, mapOverIntialData),
        window.Model.handleEventFetch(),
      ]);

      const filteredResources = window.Model.applyAllFilters();
      window.View.reRenderResources(filteredResources);
      window.View.reRenderEvents();
      window.View.refreshCalendarUI();
    } else if (tab === "leave") {
      // Fetch everything needed for leave tab together
      const [resources, timeOffData, _events] = await Promise.all([
        window.Model.handleGetResorces(getBookableResources, mapOverIntialData),
        window.Model.handleGetTimeoffWithoutSet(
          getTimeOffRequests,
          mapOverLeaveData
        ),

        window.Model.handleEventFetch(),
      ]);

      // Build lookups AFTER timeOff + workingHours finish
      window.Model.calculateLookupData(timeOffData);
      const filteredResources = window.Model.applyAllFilters();
      window.View.reRenderResources(filteredResources);
      window.View.reRenderEvents();
      window.View.refreshCalendarUI();
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
