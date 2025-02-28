AP.resize("981", "100");

const API_BASE_URL = 'https://da-api-jira-plugins-uat.azurewebsites.net/v1/api/jiraplugins';
const API_KEY =  "eyJraWQiOiIxMDNkM2U1Mi00NWRmLTRiM2QtYTFlOS0wZmIzYThkMjlkMWQiLCJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FzY2VuZGlvbi5jb20iLCJpZGVudGlmaWVyIjoiYXZhIy0qZ3B0IiwibmFtZSI6IkRueWFuZXNod2FyIEJob3NhbGUiLCJlbWFpbCI6ImRueWFuZXNod2FyLmJob3NhbGVAYXNjZW5kaW9uLmNvbSIsImlhdCI6MTcwMzY1MjA2MSwiZXhwIjoxNzM1Mjc0NDYxfQ._bDTgbQufmf_uWbsJxiPQh0N0z2pPYR6U05Jv0bi9tIXs3EK2fyxAZ1Z9rfMxPR8FIfc-8FFPLcWbXIRmFx9XQ";

let jiraUserID;
let jiraAccessToken;
let jiraUserUrl;
let selectedIssue;
let epicDescription;

AP.getLocation(function (location) {
  const url = location.toString();
  const urlObject = new URL(url);
  const queryParameter = urlObject.search;

  selectedIssue = null;
  const regex = /selectedIssue=([^&]+)/;
  const match = queryParameter.match(regex);

  if (match) {
    selectedIssue = match[1];
  } else if (url.includes("/browse/")) {
    const regex = /\/browse\/([^/]+)/;
    const match = url.match(regex);
    if (match) {
      selectedIssue = match[1];
    }
  }

  // Set jiraUserUrl based on the current URL
  jiraUserUrl = urlObject.origin + "/rest/api/3";
});

async function handleButtonClick() {
  const buttonDiv = document.getElementById("buttonDiv");
  if (buttonDiv) {
    buttonDiv.style.display = "none";
  }
  showLoader();

  try {
    await fetchCredentials();
  } catch (error) {
    showError(error.message);
  } finally {
    hideLoader();
  }
}

async function fetchCredentials() {
  const credentialUrl = `${API_BASE_URL}/ava/force/credential?jiraUserUrl=${jiraUserUrl}`;
  const headers = { "access-key": API_KEY };

  try {
    const response = await fetch(credentialUrl, { headers: headers });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch credentials");
    }
    const data = await response.json();
    if (data.payload) {
      jiraUserID = data.payload.jiraUser;
      jiraAccessToken = data.payload.jiraKey;
      jiraUserUrl = data.payload.jiraUserUrl;
      await fetchIssueDetails();
    } else {
      throw new Error(
        "Invalid response: Missing payload in credentials API response"
      );
    }
  } catch (error) {
    showError(error.message);
    throw error; // rethrow to stop further processing
  }
}

function showError(message) {
  const errorMessage = document.getElementById("errorMessage");
  const okayButton = document.getElementById("okayButton");
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
  okayButton.style.display = "inline-block";
}

async function fetchIssueDetails() {
  const url = `${API_BASE_URL}/ava/force/issuedetails?IssueId=${selectedIssue}`;
  const headers = {
    "access-key": API_KEY,
    jiraUser: jiraUserID,
    jiraKey: jiraAccessToken,
    jiraUserUrl: jiraUserUrl,
  };

  try {
    const apiResponse = await fetch(url, { method: "GET", headers: headers });
    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      throw new Error(errorData.message || "Failed to fetch issue details");
    }
    const data = await apiResponse.json();

    if (data.message === "Issue Description retrieved successfully") {
      epicDescription = data.issueDescription;
      await createStory();
    } else {
      throw new Error("Unexpected response format from issue details API");
    }
  } catch (error) {
    showError(error.message);
    throw error; // rethrow to stop further processing
  }
}

async function createStory() {
  const url = `${API_BASE_URL}/ava/force/story`;
  const headers = {
    "access-key": API_KEY,
    jiraUser: jiraUserID,
    jiraKey: jiraAccessToken,
    jiraUserUrl: jiraUserUrl,
  };
  const body = {
    epicId: selectedIssue,
    epicDescription: epicDescription,
  };

  try {
    const storyApiResponse = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!storyApiResponse.ok) {
      const errorData = await storyApiResponse.json();
      throw new Error(errorData.message || "Failed to create story");
    }

    const storyResponse = await storyApiResponse.json();
    const buttonDiv = document.getElementById("buttonDiv");
    buttonDiv.style.display = "none";

    const responseElement = document.getElementById("response");
    responseElement.textContent =
      storyResponse.message +
      " .Kindly refresh the page to view the newly created stories.";
  } catch (error) {
    showError(error.message);
    throw error; // rethrow to stop further processing
  }
}

// Show loader message
function showLoader() {
  const loader = document.getElementById("loader");
  loader.style.display = "block";
}

// Hide loader message
function hideLoader() {
  const loader = document.getElementById("loader");
  loader.style.display = "none";
}

// Handle 'Okay' button click
function handleOkayClick() {
  const errorMessage = document.getElementById("errorMessage");
  const okayButton = document.getElementById("okayButton");
  const buttonDiv = document.getElementById("buttonDiv");

  errorMessage.classList.add("hidden");
  okayButton.style.display = "none";
  buttonDiv.style.display = "block";
}

// Ensure the button is correctly referenced in the DOM
document.addEventListener("DOMContentLoaded", function () {
  const buttonDiv = document.getElementById("buttonDiv");
  if (buttonDiv) {
    buttonDiv.addEventListener("click", handleButtonClick);
  } else {
    console.error("Button element not found in the DOM.");
  }
});
