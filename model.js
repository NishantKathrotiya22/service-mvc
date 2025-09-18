// model.js
// Model: Handles data fetching, mapping, state management, and business logic

// Global State
let filterState = {
  region: null,
  worktype: null,
  search: "",
  sortAsc: true,
};

let eventData = [];
let resourceData = [];
let currentTab = "init";
let holidayDates = [];

let workOrderStatusMap = {};
let bookableResourceCategoryMap = {};
let serviceType = {};

let filterStatus = {
  isLoading: false,
  isError: false,
  region: [],
  worktype: [],
};

let resorcesState = {
  isLoading: false,
  isError: false,
  resourceData: [],
};

const eventStatus = {
  isLoading: true,
  isError: false,
  eventData: [],
};

let currentRequestToken = 0;

let timeOffLookup = {};
let workingHoursLookup = {};
let calenderIds = new Set();

const refLink = "..//WebResources/";

const leaveTypeClassMap = {
  285930012: "ec-event-yellow",
  285930013: "ec-event-yellow",
  285930014: "ec-event-yellow",
  285930015: "ec-event-yellow",
  285930027: "ec-event-yellow",
  285930028: "ec-event-yellow",
  285930003: "ec-event-pink",
  285930023: "ec-event-pink",
  285930024: "ec-event-pink",
  285930004: "ec-event-pink",
  285930005: "ec-event-pink",
  285930029: "ec-event-pink",
  285930006: "ec-event-pink",
  285930007: "ec-event-pink",
  285930008: "ec-event-pink",
  285930010: "ec-event-pink",
  285930011: "ec-event-yellow",
  285930016: "ec-event-pink",
  285930018: "ec-event-pink",
  285930017: "ec-event-pink",
  285930019: "ec-event-pink",
  285930020: "ec-event-pink",
  285930021: "ec-event-pink",
  285930000: "ec-event-pink",
  285930025: "ec-event-pink",
  285930026: "ec-event-pink",
};

// Fetch Functions (CRM API calls - parameters unchanged)
function getTerritory() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "territory",
    "?$select=territoryid,name"
  );
}

function getCareType() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "bookableresourcecategory",
    "?$select=name&$filter=statecode%20eq%200"
  );
}

function getBookableResources() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "bookableresource",
    "?$select=name,resourcetype,_calendarid_value&$expand=UserId($select=entityimage_url),msdyn_bookableresource_msdyn_resourceterritory_Resource($select=msdyn_resourceterritoryid,msdyn_name,_msdyn_resource_value,_msdyn_territory_value,statecode)"
  );
}

function getTimeOffRequests() {
  const { startDate, endDate } = getAdjustedDateRangeFromCalendar();
  const query = [
    "?$select=msdyn_endtime,vel_leavetype,msdyn_name,_msdyn_resource_value,msdyn_starttime",
    "&$filter=msdyn_starttime le " +
      endDate +
      " and msdyn_endtime ge " +
      startDate,
  ].join("");

  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "msdyn_timeoffrequest",
    query
  );
}

function getHolidays() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "crce0_ph_auto",
    "?$select=crce0_ph_autoid,crce0_date,crce0_holidayname"
  );
}

function getWorkingHours() {
  const { startDate, endDate } = getAdjustedDateRangeFromCalendar();
  const query = [
    "?$select=vel_calendarresourceworkinghourid,_vel_bookableresourceid_value,vel_duration,vel_enddate,vel_name,vel_startdate,statecode",
    "&$filter=vel_startdate le " + endDate + " and vel_enddate ge " + startDate,
  ].join("");

  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "vel_calendarresourceworkinghour",
    query
  );
}

function getAgreementBookingDatesBetween() {
  const { startDate, endDate } = getAdjustedDateRangeFromCalendar();

  const query = [
    "?$select=msdyn_agreementbookingdateid,_msdyn_agreement_value,msdyn_bookingdate,msdyn_name,_msdyn_resource_value,msdyn_status,statecode",
    "&$filter=msdyn_bookingdate ge " +
      startDate +
      " and msdyn_bookingdate le " +
      endDate,
    "&$expand=",
    "msdyn_resource($select=name),",
    "msdyn_bookingsetup($select=sog_placeholdertypecode,msdyn_agreementbookingsetupid,msdyn_estimatedduration,_ang_incidenttype_value),",
    "msdyn_workorder($select=msdyn_workorderid,msdyn_city,msdyn_country,msdyn_postalcode,_msdyn_serviceterritory_value,msdyn_stateorprovince,msdyn_address1,msdyn_address2,msdyn_address3,msdyn_systemstatus),",
    "msdyn_bookingsetup($select=sog_selectedincidentservices)",
  ].join("");

  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "msdyn_agreementbookingdate",
    query
  );
}

function getServiceType() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "msdyn_incidenttype",
    "?$select=msdyn_name"
  );
}

function getBookableResourcesWithCategory() {
  return window.parent.Xrm.WebApi.retrieveMultipleRecords(
    "bookableresource",
    "?$select=bookableresourceid,name&$expand=bookableresource_bookableresourcecategoryassn_Resource"
  );
}

// Map Functions
function getActiveTerritoryValues(territories) {
  if (!Array.isArray(territories)) return [];

  return territories
    .filter((item) => (item?.statecode ?? 0) == 0)
    .map((item) => item._msdyn_territory_value);
}

function mapOverLeaveData(response) {
  return response.entities.map((r) => ({
    id: r?._msdyn_resource_value,
    title: r?.msdyn_name,
    extendedProps: {
      imgUrl: r?.UserId?.entityimage_url ?? "/Assets/profiles/R2.jpg",
      name: r?.msdyn_name,
      resourceType: `${r?.resourcetype}` ?? "0",
      startTime: r?.msdyn_starttime,
      endTime: r?.msdyn_endtime,
      leaveType: r?.vel_leavetype,
    },
  }));
}

function mapOverIntialData(response) {
  calenderIds.clear();
  return response.entities.map((r) => {
    //Creating Array of ID To get Working Hours
    if (r?._calendarid_value) {
      calenderIds.add(r?._calendarid_value);
    }

    return {
      id: r?.bookableresourceid,
      title: r?.name,
      extendedProps: {
        imgUrl:
          r?.UserId?.entityimage_url ??
          `${refLink}sog_CareWorkerAvtar?preview=1`,
        name: r.name,
        resourceType: `${r?.resourcetype}`,
        region: getActiveTerritoryValues(
          r?.msdyn_bookableresource_msdyn_resourceterritory_Resource || []
        ),
      },
    };
  });
}

function mapOverWorkingHoursData(response) {
  return response.entities.map((r) => ({
    id: r?._vel_bookableresourceid_value,
    startTime: r?.vel_startdate,
    endTime: r?.vel_enddate,
  }));
}

function mapServiceType(data) {
  return data.entities.reduce((acc, item) => {
    acc[item.msdyn_incidenttypeid] = item.msdyn_name;
    return acc;
  }, {});
}

// Business Logic Functions
function getAdjustedDateRangeFromCalendar() {
  if (!window.ecCalendar) {
    console.warn("Calendar not found.");
    return null;
  }

  const calendarView = window.ecCalendar.view || window.ecCalendar.getView();
  const viewStart = new Date(calendarView.currentStart);
  const viewEnd = new Date(calendarView.currentEnd);

  const msPerDay = 24 * 60 * 60 * 1000;
  const dayDiff = Math.round((viewEnd - viewStart) / msPerDay);

  let startDate = new Date(viewStart);
  let endDate;

  if (dayDiff >= 10) {
    endDate = new Date(viewEnd);
  } else {
    endDate = new Date(startDate.getTime() + 9 * msPerDay);
  }

  return {
    startDate: startDate.toISOString().split("T")[0] + "T00:00:00Z",
    endDate: endDate.toISOString().split("T")[0] + "T23:59:59Z",
  };
}

function calculateLookupData(data) {
  timeOffLookup = {};
  data.forEach((leave) => {
    const resourceId = leave?.id;
    if (!timeOffLookup[resourceId]) {
      timeOffLookup[resourceId] = [];
    }
    timeOffLookup[resourceId].push({
      start: new Date(leave?.extendedProps?.startTime),
      end: new Date(leave?.extendedProps?.endTime),
      leaveType: leave?.extendedProps?.leaveType,
    });
  });
}

function calculateWorkingHoursLookup(data) {
  workingHoursLookup = {};
  data.forEach((workingHour) => {
    const resourceId = workingHour?.id;
    if (!workingHoursLookup[resourceId]) {
      workingHoursLookup[resourceId] = [];
    }
    workingHoursLookup[resourceId].push({
      start: new Date(workingHour?.startTime),
      end: new Date(workingHour?.endTime),
    });
  });
}

function getEventClassName(eventStart, eventEnd, resourceId) {
  const leaves = timeOffLookup[resourceId];
  const workingHours = workingHoursLookup[resourceId];
  const startDate = new Date(eventStart);
  const endDate = new Date(eventEnd);

  if (leaves) {
    for (const leave of leaves) {
      if (leave.start <= endDate && leave.end >= startDate) {
        return leaveTypeClassMap[leave?.leaveType] || "ec-event-yellow";
      }
    }
  }

  if (workingHours && workingHours.length > 0) {
    const eventDay = startDate.toDateString();

    const todaysHours = workingHours.filter(
      (h) => h.start.toDateString() === eventDay
    );

    if (todaysHours.length > 0) {
      let isWithinWorkingHours = false;
      for (const hours of todaysHours) {
        if (startDate >= hours.start && endDate <= hours.end) {
          isWithinWorkingHours = true;
          break;
        }
      }
      if (!isWithinWorkingHours) {
        return "ec-event-purple";
      }
    } else {
      return "ec-event-active";
    }
  }

  return "ec-event-active";
}

// Filter and Sort Logic
function getFilteredResourcesOnly() {
  const allResources = resourceData;

  let filtered = allResources.filter((resource) => {
    const resourceId = resource.id;

    const matchesRegion =
      !filterState.region ||
      filterState.region.length === 0 ||
      (Array.isArray(resource.extendedProps.region) &&
        resource.extendedProps.region.some((reg) =>
          filterState.region.includes(reg)
        ));

    const worktypeCategories = bookableResourceCategoryMap[resourceId] || [];
    const matchesWorktype =
      !filterState.worktype ||
      filterState.worktype.length === 0 ||
      worktypeCategories.some((wt) => filterState.worktype.includes(wt));

    return matchesRegion && matchesWorktype;
  });

  return filtered;
}

function applySearchFilter(resources) {
  if (!filterState.search || filterState.search.trim() === "") {
    return resources;
  }

  return resources.filter(
    (resource) =>
      resource.title &&
      resource.title.toLowerCase().includes(filterState.search.toLowerCase())
  );
}

function sortResources(resources) {
  return [...resources].sort((a, b) => {
    const titleA = a.title.toLowerCase();
    const titleB = b.title.toLowerCase();

    if (titleA < titleB) return filterState.sortAsc ? -1 : 1;
    if (titleA > titleB) return filterState.sortAsc ? 1 : -1;
    return 0;
  });
}

// Model Handlers (for controller to call)
function handleGetResorces(getResources, mapResources) {
  const requestToken = ++currentRequestToken;

  resorcesState.isLoading = true;
  resorcesState.isError = false;
  resorcesState.resourceData = [];

  // Show loading state in calendar
  if (window.ecCalendar) {
    window.ecCalendar.setOption("resources", [
      { id: "loading", title: "Loading..." },
    ]);
  }

  setTimeout(() => {
    window.View.refreshCalendarUI();
  }, 0);

  return getResources()
    .then((response) => {
      if (requestToken !== currentRequestToken) return;
      return mapResources(response);
    })
    .then((mappedResources) => {
      if (requestToken !== currentRequestToken) return;

      resorcesState.isLoading = false;
      resorcesState.resourceData = mappedResources;

      resourceData = mappedResources;
      return mappedResources;
    })
    .catch((error) => {
      if (requestToken !== currentRequestToken) return;

      console.error("Error fetching resources:", error);
      resorcesState.isLoading = false;
      resorcesState.isError = true;

      // Show error state in calendar
      if (window.ecCalendar) {
        window.ecCalendar.setOption("resources", [
          { id: "error", title: "Error loading resources" },
        ]);
      }

      throw error;
    });
}

function handleFilterFetch() {
  filterStatus.isLoading = true;
  filterStatus.isError = false;

  return Promise.all([getTerritory(), getCareType()])
    .then(([territoryResults, careTypeResults]) => {
      filterStatus.isLoading = false;
      filterStatus.isError = false;

      filterStatus.region = territoryResults?.entities || [];
      filterStatus.worktype = careTypeResults?.entities || [];

      return { region: filterStatus.region, worktype: filterStatus.worktype };
    })
    .catch((err) => {
      console.error(err);
      filterStatus.isLoading = false;
      filterStatus.isError = true;
      throw err;
    });
}

function handleGetTimeoffWithoutSet(getResources, mapResources) {
  return getResources()
    .then((response) => {
      return mapResources(response);
    })
    .catch((error) => {
      console.error("Error fetching resources:", error);
      resorcesState.isLoading = false;
      resorcesState.isError = true;
      throw error;
    });
}

function handleGetWorkingHours(getResources, mapResources) {
  return getResources()
    .then((response) => {
      return mapResources(response);
    })
    .catch((error) => {
      console.error("Error fetching working hours:", error);
      resorcesState.isLoading = false;
      resorcesState.isError = true;
      throw error;
    });
}

function handleEventFetch() {
  if (calenderIds.size !== 0 && currentTab === "leave") {
    console.error("Data Hai Call kar de");
  }
  return getAgreementBookingDatesBetween()
    .then((response) => {
      const statusMap = {
        690970000: "Active",
        690970001: "Processed",
        690970002: "Canceled",
      };
      const mappedEvents = response.entities.map((event) => {
        const startDate = new Date(event.msdyn_bookingdate);
        const durationMinutes =
          event.msdyn_bookingsetup.msdyn_estimatedduration || 60;
        const endDate = new Date(
          startDate.getTime() + durationMinutes * 60 * 1000
        );
        const addressParts = [
          event?.msdyn_workorder?.msdyn_address1 || " ",
          event?.msdyn_workorder?.msdyn_address2 || " ",
          event?.msdyn_workorder?.msdyn_address3 || " ",
          event?.msdyn_workorder?.msdyn_city || " ",
          event?.msdyn_workorder?.msdyn_stateorprovince || " ",
          event?.msdyn_workorder?.msdyn_postalcode || " ",
          event?.msdyn_workorder?.msdyn_country || " ",
        ]
          .filter((part) => part)
          .join(", ");
        return {
          resourceId: event?._msdyn_resource_value,
          start: startDate,
          end: endDate,
          id: event?.msdyn_agreementbookingdateid,
          type: "Full",
          slotEventOverlap: true,
          editable: false,
          durationEditable: false,
          eventStartEditable: false,
          extendedProps: {
            bookingID: event?._msdyn_agreement_value,
            employeeID: event?.msdyn_name,
            employeeName: event?.msdyn_resource?.name ?? "N/A",
            address: addressParts,
            suburb: event?.msdyn_workorder?.msdyn_city ?? "N/A",
            bookingStatus: statusMap[event?.msdyn_status] ?? "Unknown",
            region: event?.msdyn_workorder?._msdyn_serviceterritory_value,
            agreementBookingSetupId:
              event?.msdyn_bookingsetup?.msdyn_agreementbookingsetupid,
            service_id: event?.msdyn_bookingsetup?._ang_incidenttype_value,
            workOrderID: event?.msdyn_workorder?.msdyn_workorderid,
            workOrderStatus: event?.msdyn_workorder?.msdyn_systemstatus,
            servicesString:
              event?.msdyn_bookingsetup?.sog_selectedincidentservices ?? "",
            placeholder:
              event?.msdyn_bookingsetup?.sog_placeholdertypecode ?? false,
          },
        };
      });
      eventStatus.isLoading = false;
      eventStatus.eventData = mappedEvents;
      eventData = mappedEvents;
      return mappedEvents;
    })
    .catch((error) => {
      console.error("Error fetching events:", error.message);
      eventStatus.isLoading = false;
      eventStatus.isError = true;
      eventData = [];
      throw error;
    });
}

function loadHolidayDates() {
  return getHolidays().then((data) => {
    holidayDates = data.entities.map(
      (holiday) => holiday.crce0_date.split("T")[0]
    );
    return holidayDates;
  });
}

function bookableResourceCategoryHandler() {
  return getBookableResourcesWithCategory().then((response) => {
    const categoryMap = {};

    response.entities.forEach((resource) => {
      const categories =
        resource?.bookableresource_bookableresourcecategoryassn_Resource || [];

      categoryMap[resource?.bookableresourceid] = categories
        .filter((cat) => (cat?.statecode ?? 0) == 0)
        .map((cat) => cat?._resourcecategory_value)
        .filter(Boolean);
    });

    bookableResourceCategoryMap = categoryMap;
    return categoryMap;
  });
}

function applyAllFilters() {
  let filteredResources = getFilteredResourcesOnly();

  const anyRegionOrWorktypeFilter =
    (filterState.worktype && filterState.worktype.length > 0) ||
    (Array.isArray(filterState.region) && filterState.region.length > 0);

  if (
    !anyRegionOrWorktypeFilter &&
    (!filterState.search || filterState.search.trim() === "")
  ) {
    return sortResources(resourceData);
  }

  if (filteredResources.length === 0 && anyRegionOrWorktypeFilter) {
    filteredResources = resourceData;
  }

  let finalResources = applySearchFilter(filteredResources);

  if (
    finalResources.length === 0 &&
    filterState.search &&
    filterState.search.trim() !== ""
  ) {
    finalResources = filteredResources;
  }

  return sortResources(finalResources);
}

function resetFilterState() {
  filterState.region = [];
  filterState.worktype = [];
  filterState.search = "";
  filterState.sortAsc = true;
}

// Expose model functions for controller
window.Model = {
  handleGetResorces,
  handleFilterFetch,
  handleGetTimeoffWithoutSet,
  handleGetWorkingHours,
  handleEventFetch,
  loadHolidayDates,
  bookableResourceCategoryHandler,
  mapServiceType: (data) => mapServiceType(data),
  applyAllFilters,
  resetFilterState,
  getResources: () => resourceData,
  getEvents: () => eventData,
  getHolidayDates: () => holidayDates,
  getFilterStatus: () => filterStatus,
  getResorcesState: () => resorcesState,
  getEventStatus: () => eventStatus,
  getFilterState: () => filterState,
  setFilterState: (key, value) => {
    filterState[key] = value;
  },
  calculateLookupData,
  calculateWorkingHoursLookup,
  getEventClassName,
};
