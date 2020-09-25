import * as types from '../constants/FilterTypes';
import { Map as iMap } from 'immutable';
import deepUnfreeze from 'deep-unfreeze';
import { fieldValueToString } from '../utils/tableHelpers';
import _ from 'lodash';

export function clearAllFilters({ id, data }) {
  return {
    type: types.CLEAR_ALL_FILTERS,
    payload: { id, data },
  };
}

/**
 * @method createFilter
 * @summary Add a new filter entry to the redux store
 */
export function createFilter({ id, data }) {
  return {
    type: types.CREATE_FILTER,
    payload: { id, data },
  };
}

/**
 * @method deleteFilter
 * @summary Remove the filter with specified `id` from the store
 */
export function deleteFilter(id) {
  return {
    type: types.DELETE_FILTER,
    payload: { id },
  };
}

/**
 * @method updateNotValidFields
 * @summary updates in the store the notValidFields flag
 */
export function updateNotValidFields({ filterId, data }) {
  return {
    type: types.UPDATE_FLAG_NOTVALIDFIELDS,
    payload: { filterId, data },
  };
}

/**
 * @method updateActiveFilter
 * @summary Updates the activeFilter in the store for the corresponding entity id
 */
export function updateActiveFilter({ id, data }) {
  return {
    type: types.UPDATE_ACTIVE_FILTER,
    payload: { id, data },
  };
}

/**
 * @method updateWidgetShown
 * @summary Updates the widgetShown in the store for the corresponding entity id with a boolean value
 */
export function updateWidgetShown({ id, data }) {
  return {
    type: types.UPDATE_WIDGET_SHOWN,
    payload: { id, data },
  };
}

/**
 * @method clearStaticFilters
 * @summary Clears the existing static filters for a filter branch in the redux store
 */
export function clearStaticFilters({ filterId, data }) {
  return {
    type: types.CLEAR_STATIC_FILTERS,
    payload: { filterId, data },
  };
}

/**
 * @method getParentFilter
 * @summary as the name suggests the function is retrieving the filter data by key from the filterData
 * @param {string} filterId - key identifying the filter
 * @param {array} filterData array that contains all the filters as they are retrieved from the BE
 */
function getParentFilter({ filterId, filterData }) {
  let parentFilter = {};
  filterData.forEach((filter) => {
    if (filter.filterId && filter.filterId === filterId) {
      parentFilter = filter;
    }
    if (filter.includedFilters) {
      filter.includedFilters.forEach((incFilter) => {
        if (incFilter.filterId && incFilter.filterId === filterId) {
          parentFilter = incFilter;
        }
      });
    }
  });
  return parentFilter;
}

/**
 * @method populateFiltersCaptions
 * @summary updates the filtersCaptions object for the corresponding filter branch id in the store
 * @param {string} id - filter id used as identifier for the filters branch
 * @param {object} data - object containing the captions
 */
export function populateFiltersCaptions(filters) {
  const filtersCaptions = {};
  if (!filters) return {};
  const { filterData, filtersActive } = filters;
  if (!filtersActive) return {};

  if (filtersActive.length) {
    const removeDefault = {};

    filtersActive.forEach((filter, filterId) => {
      let captionsArray = ['', ''];

      if (filter.parameters && filter.parameters.length) {
        filter.parameters.forEach((filterParameter) => {
          const { value, parameterName, defaultValue } = filterParameter;

          if (!defaultValue && filterData) {
            // we don't want to show captions, nor show filter button as active for default values
            removeDefault[filterId] = true;
            const parentFilter = getParentFilter({
              filterId: filter.filterId, // we pass the actual key not the index
              filterData,
            });

            const filterParameter = parentFilter.parameters.find(
              (param) => param.parameterName === parameterName
            );
            let captionName = filterParameter.caption;
            let itemCaption = filterParameter.caption;

            switch (filterParameter.widgetType) {
              case 'Text':
                captionName = value;

                if (!value) {
                  captionName = '';
                  itemCaption = '';
                }
                break;
              case 'Lookup':
              case 'List':
                captionName = value && value.caption;
                break;
              case 'Labels':
                captionName = value.values.reduce((caption, item) => {
                  return `${caption}, ${item.caption}`;
                }, '');
                break;
              case 'YesNo':
                if (value === null) {
                  captionName = '';
                  itemCaption = '';
                }
                break;
              case 'Switch':
              default:
                if (!value) {
                  captionName = '';
                  itemCaption = '';
                }
                break;
            }

            if (captionName) {
              captionsArray[0] = captionsArray[0]
                ? `${captionsArray[0]}, ${captionName}`
                : captionName;
            }

            if (itemCaption) {
              captionsArray[1] = captionsArray[1]
                ? `${captionsArray[1]}, ${itemCaption}`
                : itemCaption;
            }
          }
        });
      } else {
        const originalFilter = filterData.filter(
          (item) => item.filterId === filterId
        );
        captionsArray = [originalFilter.caption, originalFilter.caption];
      }

      if (captionsArray.join('').length) {
        filtersCaptions[filter.filterId] = captionsArray;
        filtersCaptions[filterId] = captionsArray;
      }
    });
  }

  return filtersCaptions;
}

/**
 * @method filtersToMap
 * @summary creates a map with the filters fetched from the layout request
 */
export function filtersToMap(filtersArray) {
  let filtersMap = iMap();

  if (filtersArray && filtersArray.length) {
    filtersArray.forEach((filter) => {
      filtersMap = filtersMap.set(filter.filterId, filter);
    });
  }
  return filtersMap;
}

/**
 * @method filtersActiveContains
 * @summary returns a boolean value depending on the presence of the key withing the activeFilters passed array
 */
export function filtersActiveContains({ filtersActive, key }) {
  if (filtersActive.lenght === 0) return false;
  const isPresent = filtersActive.filter((item) => item.filterId === key);
  return isPresent.length ? true : false;
}

/**
 * @method setNewFiltersActive
 * @summary returns a new array with filters that are going to be the active ones
 */
export function setNewFiltersActive({ storeActiveFilters, filterToAdd }) {
  storeActiveFilters = deepUnfreeze(storeActiveFilters);
  if (
    !storeActiveFilters.length ||
    !foundAmongActiveFilters({ storeActiveFilters, filterToAdd })
  ) {
    storeActiveFilters.push(filterToAdd);
  } else {
    storeActiveFilters.forEach((activeFilter, index) => {
      if (activeFilter.filterId === filterToAdd.filterId) {
        storeActiveFilters[index] = filterToAdd;
      }
    });
  }
  return storeActiveFilters;
}

/**
 * @method foundAmongActiveFilters
 * @summary checks that the filterToAdd is found among the storeActiveFilters
 */
function foundAmongActiveFilters({ storeActiveFilters, filterToAdd }) {
  let isPresent = false;
  storeActiveFilters.forEach((item) => {
    if (item.filterId === filterToAdd.filterId) isPresent = true;
  });
  return isPresent;
}

/**
 * @method isFilterActive
 * @summary Check within the active filters array if filterId given as param is active
 * @param {string} filterId
 * @param {array} activeFilter
 */
export function isFilterActive({ filterId, filtersActive }) {
  if (filtersActive) {
    // filters with only defaultValues shouldn't be set to active
    const active = filtersActive.find(
      (item) => item.filterId === filterId && !item.defaultVal
    );

    return typeof active !== 'undefined';
  }

  return false;
}

/**
 * @method annotateFilters
 * @summary Creates caption for active filters to show when the widget is closed
 * @param {array} unannotatedFilters
 * @param {array} filtersActive
 */
export function annotateFilters({ unannotatedFilters, filtersActive }) {
  filtersActive = filtersActive ? filtersActive : [];

  return unannotatedFilters.map((unannotatedFilter) => {
    const parameter =
      unannotatedFilter.parameters && unannotatedFilter.parameters[0];
    const isActive = isFilterActive({
      filterId: unannotatedFilter.filterId,
      filtersActive,
    });
    const currentFilter = filtersActive
      ? filtersActive.find((f) => f.filterId === unannotatedFilter.filterId)
      : null;
    const activeParameter =
      parameter && isActive && currentFilter && currentFilter.parameters[0];

    const filterType =
      unannotatedFilter.parameters && activeParameter
        ? unannotatedFilter.parameters.find(
            (filter) => filter.parameterName === activeParameter.parameterName
          )
        : parameter && parameter.widgetType;

    const captionValue = activeParameter
      ? fieldValueToString({
          fieldValue: activeParameter.valueTo
            ? [activeParameter.value, activeParameter.valueTo]
            : activeParameter.value,
          fieldType: filterType,
        })
      : '';

    return {
      ...unannotatedFilter,
      captionValue,
      isActive,
    };
  });
}

/**
 * @method isFilterValid
 * @summary Function used to check the validity of a filter - returns a boolean value
 * @param {object} filters
 */
export function isFilterValid(filters) {
  if (filters.parameters) {
    return !filters.parameters.filter((item) => item.mandatory && !item.value)
      .length;
  }

  return true;
}

/**
 * @method parseToPatch
 * @summary Patches the params, resulted array has the item values set to either null or previous values
 *          this because filters with only defaultValue shoul not be sent to the server
 * @param {array} params
 */
export function parseToPatch(params) {
  return params.reduce((acc, param) => {
    // filters with only defaltValue shouldn't be sent to server
    if (!param.defaultValue || !_.isEqual(param.defaultValue, param.value)) {
      acc.push({
        ...param,
        value: param.value === '' ? null : param.value,
      });
    }

    return acc;
  }, []);
}
