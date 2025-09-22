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
let isEventFetching = false;
let calendarDataFetched = false;

let timeOffLookup = {};
let calenderIds = {};

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
  calenderIds = {};
  return response.entities.map((r) => {
    //Creating Array of ID To get Working Hours
    if (r?._calendarid_value && r?.bookableresourceid) {
      calenderIds[r?._calendarid_value] = r?.bookableresourceid;
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

function getEventClassName(eventStart, eventEnd, resourceId) {
  const leaves = timeOffLookup[resourceId];
  const startDate = new Date(eventStart);
  const endDate = new Date(eventEnd);

  if (leaves) {
    for (const leave of leaves) {
      if (leave.start <= endDate && leave.end >= startDate) {
        return leaveTypeClassMap[leave?.leaveType] || "ec-event-yellow";
      }
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

// Generate a unique batch boundary
function generateBatchBoundary() {
  return "batch_" + crypto.randomUUID();
}

// Create batch request body
function createBatchRequestBody(batchRequests, boundary) {
  let body = "";

  batchRequests.forEach((request, index) => {
    body += `--${boundary}\r\n`;
    body += "Content-Type: application/http\r\n";
    body += "Content-Transfer-Encoding: binary\r\n";
    body += `Content-ID: ${index + 1}\r\n\r\n`;

    body += `${request.method} ${request.url} HTTP/1.1\r\n`;

    // Add headers
    Object.entries(request.headers || {}).forEach(([key, value]) => {
      body += `${key}: ${value}\r\n`;
    });

    body += `\r\n`; // end headers
  });

  body += `--${boundary}--\r\n`;
  return body;
}

// Parse batch response and tag each part with its originating calendarId via Content-ID
function parseBatchResponse(responseText, requestsMeta = []) {
  const results = [];
  const parts = responseText.split(
    /--changesetresponse_[a-f0-9-]+|--batchresponse_[a-f0-9-]+/i
  );

  // Create a quick lookup: contentId (string) -> calendarId
  const contentIdToCalendarId = requestsMeta.reduce((acc, m) => {
    if (m && m.contentId != null && m.calendarId) {
      acc[String(m.contentId)] = m.calendarId;
    }
    return acc;
  }, {});

  let runningContentId = 0; // fallback counter if Content-ID header is not present

  for (const part of parts) {
    if (!part || !part.includes("{")) continue;

    try {
      // Try to read Content-ID from this part's headers
      const m = part.match(/Content-ID:\s*(\d+)/i);
      const contentId = m ? m[1] : String(++runningContentId);
      const calendarId = contentIdToCalendarId[contentId];

      const jsonStart = part.indexOf("{");
      const jsonText = part.substring(jsonStart);
      const parsed = JSON.parse(jsonText);

      const items = parsed?.result || parsed?.value || parsed || [];
      const normalized = Array.isArray(items) ? items : [items];

      // Append QueriedCalendarId to each item, if we can determine it
      normalized.forEach((item) => {
        try {
          if (calendarId) {
            item.QueriedCalendarId = calendarId;
          }
        } catch (_) {
          // ignore non-object items
        }
      });

      results.push(...normalized);
    } catch (err) {
      console.warn("Failed to parse batch part:", err);
    }
  }
  return results;
}

// Process a batch
async function processBatch(batch, startDate, endDate) {
  const boundary = generateBatchBoundary();
  const requests = batch.map((calendarId) => {
    const functionQuery = `calendars(${calendarId})/Microsoft.Dynamics.CRM.ExpandCalendar(Start=@d1,End=@d2)?@d1=${startDate}&@d2=${endDate}`;
    return {
      method: "GET",
      url: `/api/data/v9.0/${functionQuery}`,
      headers: {
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: 'odata.include-annotations="*"',
      },
    };
  });

  // Track mapping between Content-ID and calendarId
  const requestsMeta = batch.map((calendarId, idx) => ({
    contentId: idx + 1,
    calendarId,
  }));

  const body = createBatchRequestBody(requests, boundary);

  const response = await fetch(
    `${window.parent.Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.0/$batch`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body,
    }
  );

  if (!response.ok) {
    throw new Error(`Batch failed: ${response.status}`);
  }

  const text = await response.text();
  return parseBatchResponse(text, requestsMeta);
}

// Fallback function for individual requests when batch fails
async function processBatchIndividually(batch, startDate, endDate) {
  const promises = batch.map(async (calendarId) => {
    try {
      const functionQuery = `calendars(${calendarId})/Microsoft.Dynamics.CRM.ExpandCalendar(Start=@d1,End=@d2)?@d1=${startDate}&@d2=${endDate}`;

      const response = await fetch(
        `${window.parent.Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.0/${functionQuery}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Prefer: 'odata.include-annotations="*"',
          },
        }
      );

      if (!response.ok) {
        console.warn(
          `Failed to fetch calendar ${calendarId}: HTTP ${response.status}`
        );
        return { result: [] };
      }

      const data = await response.json();
      const items = data?.result || data?.value || [];
      const normalized = Array.isArray(items) ? items : [items];
      normalized.forEach((item) => {
        try {
          item.QueriedCalendarId = calendarId;
        } catch (_) {}
      });
      return normalized;
    } catch (error) {
      console.warn(`Error fetching calendar ${calendarId}:`, error.message);
      return [];
    }
  });

  const chunks = await Promise.all(promises);
  // Flatten
  return chunks.flat();
}

// Fetch all calendar data in batches
async function fetchCalendarData() {
  if (Object.keys(calenderIds).length === 0) return [];

  const { startDate, endDate } = getAdjustedDateRangeFromCalendar();
  const ids = Object.keys(calenderIds);
  const batchSize = 40; // max supported
  const results = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    console.log(
      `Processing batch ${i / batchSize + 1} (${chunk.length} calendars)`
    );

    try {
      const batchResults = await processBatch(chunk, startDate, endDate);
      results.push(...batchResults);
    } catch (err) {
      console.error("Batch failed, falling back to individual:", err.message);
      const fallback = await processBatchIndividually(
        chunk,
        startDate,
        endDate
      );
      results.push(...fallback);
    }
  }

  console.log(`Fetched ${results.length} total calendar results`);
  console.log("Calendar data batch processing completed successfully");
  console.log(results);
  return results;
}

// =====================
// Helpers
// =====================

// Map agreement booking dates (existing CRM events)
function mapBookingEvents(response) {
  const statusMap = {
    690970000: "Active",
    690970001: "Processed",
    690970002: "Canceled",
  };

  return response.entities.map((event) => {
    const startDate = new Date(event.msdyn_bookingdate);
    const durationMinutes =
      event.msdyn_bookingsetup.msdyn_estimatedduration || 60;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

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
      display: "auto",
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
}

// Map availability calendar items into background events
function mapCalendarEvents(calendarData) {
  return calendarData.flatMap((item) => {
    const events = [];
    if (item?.TimeCode !== "Available") {
      return [];
    }

    // Fixed work hours
    const workStart = new Date(item?.Start);
    const workEnd = new Date(item?.End);

    // Full day range
    const dayStart = new Date(workStart);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(workEnd);
    dayEnd.setHours(23, 59, 59, 999);

    // Pre-work gap
    if (dayStart < workStart) {
      events.push({
        resourceId: calenderIds[item?.QueriedCalendarId],
        start: dayStart,
        end: workStart,
        type: "gap",
        display: "background",
      });
    }

    // Post-work gap
    if (workEnd < dayEnd) {
      events.push({
        resourceId: calenderIds[item?.QueriedCalendarId],
        start: workEnd,
        end: dayEnd,
        type: "gap",
        display: "background",
      });
    }

    return events;
  });
}

// =====================
// Main Event Fetcher
// =====================
async function handleEventFetch() {
  if (isEventFetching) {
    console.log("Event fetch already in progress, skipping...");
    return Promise.resolve();
  }

  isEventFetching = true;
  console.log("Starting event fetch...");

  try {
    let allEvents = [];

    // 1. If leave tab → fetch and map calendar availability
    if (currentTab === "init" && Object.keys(calenderIds).length !== 0) {
      console.log("Fetching calendar data before processing events...");
      try {
        const calendarData = await fetchCalendarData();
        calendarDataFetched = true;
        const calendarEvents = mapCalendarEvents(calendarData);
        allEvents.push(...calendarEvents);
      } catch (error) {
        console.error("Failed to fetch calendar data:", error);
      }
    }

    // 2. Always fetch booking events
    const bookingResponse = await getAgreementBookingDatesBetween();
    const bookingEvents = mapBookingEvents(bookingResponse);
    allEvents.push(...bookingEvents);

    // 3. Save combined events
    eventStatus.isLoading = false;
    eventStatus.eventData = allEvents;
    eventData = allEvents;

    console.log("✅ Event fetch completed successfully");
    return allEvents;
  } catch (error) {
    console.error("❌ Error in handleEventFetch:", error);
    eventStatus.isLoading = false;
    eventStatus.isError = true;
    eventData = [];
    throw error;
  } finally {
    isEventFetching = false;
  }
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

function resetEventFetchFlags() {
  isEventFetching = false;
  calendarDataFetched = false;
}

// Expose model functions for controller
window.Model = {
  handleGetResorces,
  handleFilterFetch,
  handleGetTimeoffWithoutSet,
  handleEventFetch,
  fetchCalendarData,
  loadHolidayDates,
  bookableResourceCategoryHandler,
  mapServiceType: (data) => mapServiceType(data),
  applyAllFilters,
  resetFilterState,
  resetEventFetchFlags,
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
  getEventClassName,
};
