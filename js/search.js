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

  const filterWrapper = document.querySelector("#search-filters");
  const filterFormAccordions = document.querySelectorAll("#search-filters details");
  const allFilters = document.querySelectorAll("#search-filters label");
  const typeFilters = document.querySelectorAll ("#search-type-filters label");
  const topicFilters = document.querySelectorAll("#search-topic-filters label");
  const resultCountText = document.querySelector("#search-result-count");
  const searchInput = document.querySelector("#search-input");
  const searchReset = document.querySelector("#search-query-reset");

  const loadMoreButton = document.querySelector("#load-more-button");

  let allResultsCount = 0;
  let visibleResultsCount;
  // Filter indicators

  // const queryResultIndicator = document.querySelector("[data-indicator='query']");
  // const queryResultIndicatorText = queryResultIndicator.querySelector("span");
  const searchResultIndicators = document.querySelector(".search-result-filters");
  const typeResultIndicator = document.querySelector("[data-indicator='type']");
  const typeResultIndicatorText = typeResultIndicator.querySelector("span");
  const topicResultIndicator = document.querySelector("[data-indicator='topic']");
  const topicResultIndicatorText = topicResultIndicator.querySelector("span");

  // let otherSearchCounts = {};

  let pageCount = 1;
  const resultsPerPage = 5;

  const pluralizeResultCount = resultCount => {
    return (resultCount === 1) ? `${resultCount} result` : `${resultCount} results`;
  };

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

  const populateSkeleton = count => {
    const skeletonTemplate = document.querySelector("#search-skeleton");

    const skeletonCount = count >= 5 ? 5 : count;

    for (let i = 1; i <= skeletonCount; i++) {
      resultsWrapper.innerHTML += skeletonTemplate.innerHTML;
    }
  }

  // Handle each search
  const updateSearch = async (searchType, isNew) => {
    // Get markup templates
    const noResultsTemplate = document.querySelector("#search-no-results");
    const noMatchesTemplate = document.querySelector("#search-no-matches");
    const resultTemplate = document.querySelector("#search-result");

    // const hasQuery = urlParams.has("query");
    // const hasType = urlParams.has("type");
    // const hasTopic = urlParams.has("topics");

    const currentQuery = searchInput.value || null;

    if (searchType !== "paginate") {
      resultsWrapper.innerHTML = '';
    }

    // If the user has already filtered their search,
    // store the filters so we can re-apply them once the
    // search is done

    const currentTopicFilter = activeFilters.topics;
    const currentTypeFilter = activeFilters.pageType;

    if (urlParams.has('q')) {
      urlParams.set('q', currentQuery);
    } else if (currentQuery) {
      urlParams.append('q', currentQuery);
    } else {
      urlParams.set('q', null);
    }

    if (currentTopicFilter) {
      urlParams.set('topics', currentTopicFilter.any.toString());
    } else {
      urlParams.set('topics', 'all');
    }

    if (currentTypeFilter) {
      urlParams.set('type', currentTypeFilter.any.toString());
    } else {
      urlParams.set('type', 'all');
    }

    window.history.replaceState({}, '', `${location.pathname}?${urlParams}`);

    // For accurate result count numbers,
    // always retrieve unfiltered results for new search terms
    if (searchType === "query") {
      activeFilters.topics = undefined;
      activeFilters.pageType = undefined;
    }

    // Conduct search
    const search = await pagefind.search(
      currentQuery, {
        filters: activeFilters
      }
    );

    const unfilteredSearch = await pagefind.search(currentQuery);

    allResultsCount = unfilteredSearch.results.length;

    // if (isNew) {
    //   otherSearchCounts.Strategy = await pagefind.search(
    //     currentQuery, {
    //       filters: {
    //         pageType: "Strategy"
    //       }
    //     }
    //   );

    //   otherSearchCounts.Story = await pagefind.search(
    //     currentQuery, {
    //       filters: {
    //         pageType: "Story"
    //       }
    //     }
    //   );

    //   otherSearchCounts.Resource = await pagefind.search(
    //     currentQuery, {
    //       filters: {
    //         pageType: "Resource"
    //       }
    //     }
    //   );

    //   otherSearchCounts.Meeting = await pagefind.search(
    //     currentQuery, {
    //       filters: {
    //         pageType: "Meeting"
    //       }
    //     }
    //   );

    //   otherSearchCounts.Page = await pagefind.search(
    //     currentQuery, {
    //       filters: {
    //         pageType: "Page"
    //       }
    //     }
    //   );
    // }

    // Populate the search page with markup
    const resultPane = document.createElement("div");

    if (isNew) {
      visibleResultsCount = allResultsCount;
    } else {
      visibleResultsCount = search.results.length;
    }

    if (allResultsCount < 1) {
      resultCountText.hidden = true;
      resultPane.innerHTML = noResultsTemplate.innerHTML;
    } else {
      filterWrapper.hidden = false;
      if (visibleResultsCount < 1) {
        resultCountText.hidden = true;
        resultPane.innerHTML = noMatchesTemplate.innerHTML;
      } else if (visibleResultsCount !== allResultsCount) {
        resultCountText.hidden = false;
        resultCountText.innerHTML = `${visibleResultsCount} of ${pluralizeResultCount(allResultsCount)} match your filters`;
        populateSkeleton(visibleResultsCount - (resultsPerPage * (pageCount - 1)));
      } else {
        resultCountText.hidden = false;
        resultCountText.innerHTML = pluralizeResultCount(allResultsCount);
        populateSkeleton(allResultsCount - (resultsPerPage * (pageCount - 1)));
      }
    }

    if (resultsPerPage * pageCount >= visibleResultsCount) {
      loadMoreButton.hidden = true;
    } else if (visibleResultsCount > resultsPerPage) {
      loadMoreButton.hidden = false;
    } else {
      loadMoreButton.hidden = true;
    }

    // Populate search results
    if (visibleResultsCount >= 1) {
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

    // Toggle filter visibility

    if (isNew && currentQuery !== null) {
      for (const filter of allFilters) {
        const input = filter.querySelector("input");
        const filterType = input.dataset.filterType;
        const filterName = input.dataset.filterName;
        console.log(`${filterType}.${filterName}`)
        const filteredCount = search.filters[filterType][filterName];

        if (filteredCount > 0 || input.checked) {
          filter.hidden = false;
        } else {
          filter.hidden = true;
        }
      }
    }



    // // Populate the result counts next to each filter
    // for (const filter of allFilters) {
    //   const input = filter.querySelector("input");
    //   const filterType = input.dataset.typeFilter ? "pageType" : "topics";
    //   // const counter = filter.querySelector(".search-counter");
    //   const isAllResults = filter.dataset.allResults;
    //   const criteria = input.dataset.typeFilter || input.dataset.topicFilter;
    //   const unfilteredCount = unfilteredSearch.filters[filterType][criteria]
    //   const currentCount = search.filters[filterType][criteria];
    //   let count;



    //   if (searchType === "type" && input.dataset.topicFilter) {
    //     if (target === "all") {
    //       count = unfilteredSearch[criteria];
    //     } else {
    //       count = otherSearchCounts[target].filters.topics[criteria];
    //     }
    //   } else {
    //     count = currentCount;
    //   }

    //   if (isNew || (searchType === "type" && input.dataset.topicFilter)) {
    //     // if (isAllResults) {
    //     //   counter.innerHTML = allResultsCount;
    //     // } else {
    //     //   counter.innerHTML = count;
    //     // }
    //     if (count || isAllResults) {
    //       filter.hidden = false;
    //     } else if (!count && input.checked) {
    //       filter.hidden = false;
    //     } else {
    //       filter.hidden = true;
    //     }
    //   }
    // }

    if (currentTopicFilter) {
      activeFilters.topics = currentTopicFilter;
    }

    if (currentTypeFilter) {
      activeFilters.pageType = currentTypeFilter;
    }

    const skeletonItems = document.querySelectorAll(".search-result[data-blank]");

    for (let item of skeletonItems) {
      item.remove();
    }

    resultsWrapper.innerHTML = resultPane.innerHTML;
  }

  if (urlParams.size > 0) {
    const queryParam = urlParams.get("q");
    const typeParam = urlParams.get("type");
    const topicParam = urlParams.get("topics");

    if (queryParam && queryParam !== "null") {
      searchInput.value = queryParam;
      searchReset.hidden = false;
    }

    if (topicParam && topicParam !== "all") {
      activeFilters.topics = new Object();
      activeFilters.topics.any = new Array();

      const topicArray = topicParam.split(",");

      activeFilters.topics.any = topicArray;

      for (let i in topicArray) {
        const topicInput = document.querySelector(`[data-filter-name="${topicArray[i]}"]`);
        topicInput.checked = true;
      }
    }

    if (typeParam && typeParam !== "all") {
      activeFilters.pageTypes = new Object();
      activeFilters.pageTypes.any = new Array();

      const pageTypesArray = typeParam.split(",");

      activeFilters.pageTypes.any = pageTypesArray;

      for (let i in pageTypesArray) {
        const typeInput = document.querySelector(`[data-filter-name="${pageTypesArray[i]}"]`);
        typeInput.checked = true;
      }
    }

    updateSearch(undefined, true);
  }

  loadMoreButton.addEventListener('click', async (e) => {
    pageCount += 1;
    updateSearch("paginate");

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

    pageCount = 1;
    e.preventDefault();

    for (const filter of allFilters) {
      filter.querySelector("input").checked = false;
    }

    updateSearch("query", true);

  });

  const updateFilters = (filter, filterType) => {
    const input = filter.querySelector("input");
    const criteria = input.dataset.filterName;

    input.addEventListener("change", (e) => {
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
    })
  }

  // Handle updates to topic filters
  for (const filter of topicFilters) {
    updateFilters(filter, "topics");
  };

  // Handle updates to type filter
  for (const filter of typeFilters) {
    updateFilters(filter, "pageType");
  };

});