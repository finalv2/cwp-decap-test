window.addEventListener('DOMContentLoaded', async (e) => {

  const urlParams = new URLSearchParams(document.location.search);

  // Initialize Pagefind
  const pagefind = await import("/pagefind/pagefind.js");
  const filters = await pagefind.filters();
  await pagefind.init();

  const pageTypes = ["Strategy", "Story", "Resource", "Meeting", "Page"]

  const activeFilters = {};

  // Select elements
  const searchButton = document.querySelector("#search-button");
  const searchContent = document.querySelector(".search-content");
  const resultsWrapper = document.querySelector("#search-results");

  const allResultsInput = document.querySelector(`label[for="type-all"] input`);

  const filterWrapper = document.querySelector("#search-filters");
  const allFilters = document.querySelectorAll("#search-filters label");
  const typeFilters = document.querySelectorAll ("#search-type-filters label");
  const topicFilters = document.querySelectorAll("#search-topic-filters label");
  const resultCountText = document.querySelector("#search-result-count");
  const searchInput = document.querySelector("#search-input");

  const loadMoreButton = document.querySelector("#load-more-button");

  let allResultsCount = 0;
  let visibleResultsCount;

  let otherSearchCounts = {};

  let pageCount = 1;
  let resultsPerPage = 5;

  const pluralizeResultCount = resultCount => {
    return (resultCount === 1) ? `${resultCount} result` : `${resultCount} results`;
  };

  const populateSkeleton = count => {
    const skeletonTemplate = document.querySelector("#search-skeleton");

    const skeletonCount = count >= 5 ? 5 : count;

    for (let i = 1; i <= skeletonCount; i++) {
      resultsWrapper.innerHTML += skeletonTemplate.innerHTML;
    }
  }

  // Handle each search
  const updateSearch = async (searchType, isNew, target) => {
    // Get markup templates
    const noResultsTemplate = document.querySelector("#search-no-results");
    const noMatchesTemplate = document.querySelector("#search-no-matches");
    const resultTemplate = document.querySelector("#search-result");



    const currentQuery = searchInput.value;

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
    } else {
      urlParams.append('q', currentQuery);
    }

    if (currentTopicFilter) {
      urlParams.set('topics', currentTopicFilter.any.toString());
    } else {
      urlParams.set('topics', 'all');
    }

    if (currentTypeFilter) {
      urlParams.set('type', currentTypeFilter);
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

    if (searchType === "query") {
      visibleResultsCount = allResultsCount;
    } else {
      visibleResultsCount = search.results.length;
    }

    if (allResultsCount < 1) {
      resultCountText.hidden = true;
      filterWrapper.hidden = true;
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

    // Show the search content area
    searchContent.hidden = false;

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

    if (isNew) {
      for (const typeFilter of typeFilters) {
        const input = typeFilter.querySelector("input");
        const filterName = input.dataset.typeFilter;

        if (filterName !== "all") {
          const unfilteredCount = unfilteredSearch.filters["pageType"][filterName];

          if (unfilteredCount > 0 && allResultsCount > 1) {
            typeFilter.hidden = false;
          } else {
            typeFilter.hidden = true;
          }
        }
      }
    }

    for (const topicFilter of topicFilters) {
      const input = topicFilter.querySelector("input");
      const filterName = input.dataset.topicFilter;
      const filteredCount = search.filters.topics[filterName];

      if (filteredCount > 0) {
        topicFilter.hidden = false;
      } else {
        topicFilter.hidden = true;
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

    searchInput.value = queryParam;

    if (topicParam !== "all") {
      activeFilters.topics = new Object();
      activeFilters.topics.any = new Array();

      const topicArray = topicParam.split(",");

      activeFilters.topics.any = topicArray;

      for (let i in topicArray) {
        const topicInput = document.querySelector(`[data-topic-filter="${topicArray[i]}"]`);
        topicInput.checked = true;
      }
    }

    if (typeParam !== "all") {
      activeFilters.pageType = typeParam;

      const typeInput = document.querySelector(`[data-type-filter="${typeParam}"]`);

      typeInput.checked = true;
    }

    updateSearch(undefined, true);
  }

  loadMoreButton.addEventListener('click', async (e) => {
    pageCount += 1;
    updateSearch("paginate");

  });

  searchInput.addEventListener("input", (e) => {
    pagefind.preload(e.target.value);
  })


  // Handle new search queries
  searchButton.addEventListener('click', async (e) => {
    pageCount = 1;
    e.preventDefault();
    allResultsInput.checked = true;

    for (const filter of topicFilters) {
      filter.querySelector("input").checked = false;
    }

    updateSearch("query", true);

  });

  // Handle updates to topic filters
  for (const filter of topicFilters) {

    const input = filter.querySelector("input");
    const criteria = input.dataset.topicFilter;

    input.addEventListener("change", (e) => {
      pageCount = 1;

      if (!activeFilters.topics) {
        activeFilters.topics = new Object();
        activeFilters.topics.any = new Array();
      }
      if (!input.checked) {
        if (activeFilters.topics.any.length === 1) {
          activeFilters.topics = undefined;
        } else {
          const index = activeFilters.topics.any.indexOf(criteria);
          activeFilters.topics.any.splice(index,1);
        }
      } else {
        activeFilters.topics.any.push(criteria);
      }
      updateSearch("topic");
    })
  };

  // Handle updates to type filter
  for (const tab of typeFilters) {
    tab.addEventListener('change', async (e) => {
      pageCount = 1;

      const currentType = e.target.dataset.typeFilter;

      if (currentType === "all") {
        activeFilters.pageType = undefined;
      } else {
        activeFilters.pageType = currentType;
      }

      updateSearch("type", false, currentType);
    });

  };

});