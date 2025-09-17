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
    window.refreshCalendarUI = window.View.refreshCalendarUI;
    window.handleEventFetch = async () => {
      await window.Model.handleEventFetch();
      window.View.reRenderEvents();
    };

    // 6. Switch to initial tab
    await switchTab("init");
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// Event Handlers
async function switchTab(tab) {
  try {
    currentTab = tab;
    resetFilters();
    window.Model.bookableResourceCategoryHandler();
    window.View.resetDynamicHeight();

    if (tab === "init") {
      // Fetch resources and events for initial tab
      await window.Model.handleGetResorces(
        getBookableResources,
        mapOverIntialData
      );
      const filteredResources = window.Model.applyAllFilters();
      window.View.reRenderResources(filteredResources);

      await window.Model.handleEventFetch();
      window.View.reRenderEvents();
      window.View.refreshCalendarUI();
    } else if (tab === "leave") {
      // Fetch resources first
      await window.Model.handleGetResorces(
        getBookableResources,
        mapOverIntialData
      );

      // Then fetch time off and working hours data
      const [timeOffData, workingHoursData] = await Promise.all([
        window.Model.handleGetTimeoffWithoutSet(
          getTimeOffRequests,
          mapOverLeaveData
        ),
        window.Model.handleGetWorkingHours(
          getWorkingHours,
          mapOverWorkingHoursData
        ),
      ]);

      // Calculate lookup data
      window.Model.calculateLookupData(timeOffData);
      window.Model.calculateWorkingHoursLookup(workingHoursData);

      // Apply filters and render resources
      const filteredResources = window.Model.applyAllFilters();
      window.View.reRenderResources(filteredResources);

      // Fetch and render events
      await window.Model.handleEventFetch();
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
      const [timeOffData, workingHoursData] = await Promise.all([
        window.Model.handleGetTimeoffWithoutSet(
          getTimeOffRequests,
          mapOverLeaveData
        ),
        window.Model.handleGetWorkingHours(
          getWorkingHours,
          mapOverWorkingHoursData
        ),
      ]);

      window.Model.calculateLookupData(timeOffData);
      window.Model.calculateWorkingHoursLookup(workingHoursData);

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

      const [timeOffData, workingHoursData] = await Promise.all([
        window.Model.handleGetTimeoffWithoutSet(
          getTimeOffRequests,
          mapOverLeaveData
        ),
        window.Model.handleGetWorkingHours(
          getWorkingHours,
          mapOverWorkingHoursData
        ),
      ]);

      window.Model.calculateLookupData(timeOffData);
      window.Model.calculateWorkingHoursLookup(workingHoursData);

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
