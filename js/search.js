window.addEventListener('DOMContentLoaded', async (e) => {

  const isSmallScreen = window.matchMedia("(width <= 60rem)");

  const urlParams = new URLSearchParams(document.location.search);

  // Initialize Pagefind
  const pagefind = await import("/pagefind/pagefind.js");
  await pagefind.init();

  // Initialize Pagefind filters
  // (This is required for loading result counts by page type and topic,
  // even though the variable is unused)
  const filters = await pagefind.filters();

  // Track the filters the user selected
  const activeFilters = {};

  // Select elements
  const searchButton = document.querySelector("#search-button");
  const resultsWrapper = document.querySelector("#search-results");

  const filterFormAccordions = document.querySelectorAll("#search-filters details");
  const allFilters = document.querySelectorAll("#search-filters label");
  const typeFilters = document.querySelectorAll ("#search-type-filters label");
  const topicFilters = document.querySelectorAll("#search-topic-filters label");

  const searchInput = document.querySelector("#search-input");
  const searchReset = document.querySelector("#search-query-reset");

  const resultCountText = document.querySelector("#search-result-count");
  const loadMoreButton = document.querySelector("#load-more-button");

  // Filter indicators

  const searchResultIndicators = document.querySelector(".search-result-filters");
  const typeResultIndicator = document.querySelector("[data-indicator='type']");
  const typeResultIndicatorText = typeResultIndicator.querySelector("span");
  const topicResultIndicator = document.querySelector("[data-indicator='topic']");
  const topicResultIndicatorText = topicResultIndicator.querySelector("span");

  const typeReset = document.querySelector("#type-reset");
  const topicReset = document.querySelector("#topic-reset");


  // Get HTML templates
  const resultsStatus = document.querySelector("#search-results-status-template");
  const blankTemplate = document.querySelector("#search-blank");
  const noResultsTemplate = document.querySelector("#search-no-results");
  const noMatchesTemplate = document.querySelector("#search-no-matches");
  const resultTemplate = document.querySelector("#search-result");

  // Track search result counts
  let allResultsCount = 0;
  let matchingResultsCount;

  // Track page count
  let pageCount = 1;
  const resultsPerPage = 8;

  // Only apply collapsible mobile filters if JS is enabled
  if (isSmallScreen.matches) {
    for (const accordion of filterFormAccordions) {
      accordion.open = false;
    }
  }

  isSmallScreen.addEventListener('change', e => {
    for (const accordion of filterFormAccordions) {
      accordion.open = !e.matches;
    }
  });

  // Add the right number of skeleton UI list items
  // while results are loading
  const populateSkeleton = count => {
    resultsWrapper.ariaBusy = true;
    const skeletonTemplate = document.querySelector("#search-skeleton");

    const skeletonCount = count >= resultsPerPage ? resultsPerPage : count;

    for (let i = 1; i <= skeletonCount; i++) {
      resultsWrapper.innerHTML += skeletonTemplate.innerHTML;
    }
  }

  // Handle each new search
  const updateSearch = async (searchType, isNew) => {
    const currentTopicFilter = activeFilters.topics;
    const currentTypeFilter = activeFilters.pageType;
    const resultPane = document.createElement("div");

    const currentQuery = (searchType === "reset") ? null : (searchInput.value || null);

    // Search with no filters applied (to determine which topic
    // and page type filters we should show and hide)
    const unfilteredSearch = await pagefind.search(currentQuery);

    const isNotSearching = !currentQuery && !activeFilters.topics && !activeFilters.pageType;

    // Search with filters applied
    const search = await pagefind.search(
      currentQuery, {
        filters: activeFilters
      }
    );

    // Logic for displaying "X result(s) match(es) your filter(s)"
    const pluralizeFilters = () => {
      if ((currentTypeFilter && currentTopicFilter) || currentTopicFilter && currentTopicFilter.any.length > 1 || currentTypeFilter && currentTypeFilter.any.length > 1) {
        return "filters";
      } else {
        return "filter";
      }
    }

    const replaceResultsWith = template => {
      resultCountText.hidden = true;
      resultPane.innerHTML = '';
      resultsStatus.innerHTML = template.innerHTML;
    }

    const showResultCount = (resultCount, isFiltered) => {
      resultCountText.hidden = false;
      resultsStatus.innerHTML = '';

      if (isFiltered) {
        resultCountText.innerHTML = (resultCount === 1) ? `${resultCount} result matches your ${pluralizeFilters()}` : `${resultCount} results match your ${pluralizeFilters()}`;
      } else {
        resultCountText.innerHTML = (resultCount === 1) ? `${resultCount} result` : `${resultCount} results`;
      }
    };

    // Show badges under the search bar
    // describing all applied filters

    searchResultIndicators.hidden = !(currentTypeFilter || currentTopicFilter);

    typeResultIndicator.hidden = !currentTypeFilter;

    if (currentTypeFilter?.any.length > 1) {
      typeResultIndicatorText.textContent = currentTypeFilter?.any.sort((a, b) => a.localeCompare(b)).join(', ');
    } else {
      typeResultIndicatorText.textContent = currentTypeFilter?.any.join(', ');
    }


    topicResultIndicator.hidden = !currentTopicFilter;

    if (currentTopicFilter?.any) {
      let topicClone;

      if (currentTopicFilter?.any.length > 1) {
        topicClone = currentTopicFilter.any.slice().sort((a, b) => a.localeCompare(b));
      } else {
        topicClone = currentTopicFilter.any.slice();
      }

      const topicString = topicClone.join(", ").replace("noTopic", "No topic");

      topicResultIndicatorText.textContent = topicString;
    }

    // Always clear the search results area
    // unless the user has clicked the "load more" button
    if (searchType !== "paginate") {
      resultsWrapper.innerHTML = '';
    }

    // Update URL parameters
    if (urlParams.has('q') && currentQuery) {
      urlParams.set('q', currentQuery);
    } else if (currentQuery) {
      urlParams.append('q', currentQuery);
    } else {
      urlParams.delete('q');
    }

    if (currentTopicFilter) {
      urlParams.set('topics', currentTopicFilter.any.toString());
    } else {
      urlParams.delete('topics');
    }

    if (currentTypeFilter) {
      urlParams.set('type', currentTypeFilter.any.toString());
    } else {
      urlParams.delete('type');
    }

    window.history.replaceState({}, '', `${location.pathname}?${urlParams}`);

    // Populate the search page with markup

    allResultsCount = unfilteredSearch.results.length;
    matchingResultsCount = (!currentTopicFilter && !currentTypeFilter) ? allResultsCount : search.results.length;

    if (isNotSearching) {
      replaceResultsWith(blankTemplate);
    } else {
      if (allResultsCount < 1) {
        replaceResultsWith(noResultsTemplate);
      } else if (matchingResultsCount < 1) {
        replaceResultsWith(noMatchesTemplate);
      } else if (matchingResultsCount !== allResultsCount) {
        if (currentTypeFilter || currentTopicFilter) {
          showResultCount(matchingResultsCount, true);
        } else {
          showResultCount(matchingResultsCount);
        }
        populateSkeleton(matchingResultsCount - (resultsPerPage * (pageCount - 1)));
      } else {
        showResultCount(allResultsCount);
        populateSkeleton(allResultsCount - (resultsPerPage * (pageCount - 1)));
      }


      // Populate search results
      if (matchingResultsCount >= 1) {
        for (const i in search.results.slice(0, resultsPerPage * pageCount)) {
          const thisResult = await search.results[i].data();

          const resultClone = resultTemplate.content.cloneNode(true);
          const resultLink = resultClone.querySelector("a");
          const resultTitle = resultClone.querySelector("h3");
          const resultExcerpt = resultClone.querySelector("p");

          resultLink.href = thisResult.url;
          resultTitle.innerHTML = thisResult.meta.title;
          resultExcerpt.innerHTML = thisResult.excerpt;

          resultPane.appendChild(resultClone);
        }
      }

      // Toggle visibility of filters when the
      // user changes their free-text query

      if ((urlParams.has("q") && isNew) || searchType === "query") {
        for (const filter of allFilters) {
          const input = filter.querySelector("input");
          const filterType = input.dataset.filterType;
          const filterName = input.dataset.filterName;
          let filteredCount = undefined;


          if (unfilteredSearch.filters[filterType] && searchType === "query") {
            filteredCount = search.filters[filterType][filterName];
          } else if (search.filters[filterType]) {
            filteredCount = search.totalFilters[filterType][filterName];
          }

          if (filteredCount === undefined || filteredCount > 0 || input.checked || allResultsCount < 1) {
            filter.hidden = false;
          } else {
            filter.hidden = true;
          }
        }
      } else if (searchType === "reset") {
        for (const filter of allFilters) {
          filter.hidden = false;
        }
      }
    }

    // Hide and show the "Load more" button based on
    // whether there are more results to display

    if (isNotSearching || resultsPerPage * pageCount >= matchingResultsCount) {
      loadMoreButton.hidden = true;
    } else if (matchingResultsCount > resultsPerPage) {
      loadMoreButton.hidden = false;
    } else {
      loadMoreButton.hidden = true;
    }

    if (currentTopicFilter) {
      activeFilters.topics = currentTopicFilter;
    }

    if (currentTypeFilter) {
      activeFilters.pageType = currentTypeFilter;
    }

    for (const item of document.querySelectorAll(".search-result[data-blank]")) {
      item.remove();
    }

    resultsWrapper.innerHTML = resultPane.innerHTML;
    resultsWrapper.ariaBusy = false;
  }

  // Process URL parameters upon page load
  if (urlParams.size > 0) {
    const queryParam = urlParams.get("q");
    const typeParam = urlParams.get("type");
    const topicParam = urlParams.get("topics");

    if (queryParam) {
      searchInput.value = queryParam;
      searchReset.hidden = false;
    }

    if (topicParam) {
      activeFilters.topics = new Object();
      activeFilters.topics.any = new Array();

      const topicArray = topicParam.split(",");

      activeFilters.topics.any = topicArray;

      for (let i in topicArray) {
        const topicInput = document.querySelector(`[data-filter-name="${topicArray[i]}"]`);
        topicInput.checked = true;
      }
    }

    if (typeParam) {
      activeFilters.pageType = new Object();
      activeFilters.pageType.any = new Array();

      const pageTypeArray = typeParam.split(",");

      activeFilters.pageType.any = pageTypeArray;

      for (let i in pageTypeArray) {
        const typeInput = document.querySelector(`[data-filter-name="${pageTypeArray[i]}"]`);
        typeInput.checked = true;
      }
    }

    updateSearch(undefined, true);
  } else {
    resultsStatus.innerHTML = blankTemplate.innerHTML;
  }

  // Click event listeners
  loadMoreButton.addEventListener('click', async (e) => {
    pageCount += 1;

    updateSearch("paginate");
  });

  searchButton.addEventListener('click', async (e) => {
    pageCount = 1;
    e.preventDefault();

    updateSearch("query", true);
  });

  searchReset.addEventListener("click", async (e) => {
    e.target.hidden = true;

    pageCount = 1;

    updateSearch("reset", true);
  });

  typeReset.addEventListener("click", async (e) => {
    pageCount = 1;
    e.preventDefault();

    activeFilters["pageType"] = undefined;

    for (const filter of typeFilters) {
      const input = filter.querySelector("input");
      input.checked = false;
    }

    updateSearch("query");
  });

  topicReset.addEventListener("click", async (e) => {
    pageCount = 1;
    e.preventDefault();

    activeFilters["topics"] = undefined;

    for (const filter of topicFilters) {
      const input = filter.querySelector("input");
      input.checked = false;
    }

    updateSearch("query");
  });


  searchInput.addEventListener("input", async (e) => {
    e.preventDefault();
    const value = e.target.value;

    searchReset.hidden = !value;

    // Attempt to preload search results as the user types
    pagefind.preload(value);
  });

  // Handle filter updates

  const updateFilters = (filter, filterType) => {
    const input = filter.querySelector("input");
    const criteria = input.dataset.filterName;

    const updateFilter = () => {
      pageCount = 1;

      if (!activeFilters[filterType]) {
        activeFilters[filterType] = new Object();
        activeFilters[filterType]["any"] = new Array();
      }
      if (!input.checked) {
        if (activeFilters[filterType]["any"].length === 1) {
          activeFilters[filterType] = undefined;
        } else {
          const index = activeFilters[filterType]["any"].indexOf(criteria);
          activeFilters[filterType]["any"].splice(index,1);
        }
      } else {
        activeFilters[filterType]["any"].push(criteria);
      }
      updateSearch(filterType);
    }

    input.addEventListener("change", () => {
      updateFilter();
    })


    // Since search filter checkboxes look like buttons,
    // they should respond to Enter keypresses

    input.addEventListener('keypress', e => {
      if (e.which === 13) {
        e.target.checked = !e.target.checked;
        updateFilter();
      }
    });
  }

  for (const filter of topicFilters) {
    updateFilters(filter, "topics");
  };

  for (const filter of typeFilters) {
    updateFilters(filter, "pageType");
  };
});