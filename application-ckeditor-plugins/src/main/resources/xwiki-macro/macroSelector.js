/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
define('macroSelectorTranslationKeys', [], [
  'title',
  'filter.text.placeholder',
  'filter.category.all',
  'filter.category.notinstalled',
  'filter.category.other',
  'failedToRetrieveMacros',
  'select',
  'recommended',
  'install',
  'install.confirm',
  'install.notAllowed'
]);

define('macroSelector', ['jquery', 'modal', 'l10n!macroSelector'], function($, $modal, translations) {
  'use strict';
  var macrosBySyntax = {},
  allMacrosExcludedCategories = [],

  getMacros = function(syntaxId, force) {
    var deferred = $.Deferred();
    var macros = macrosBySyntax[syntaxId || ''];
    if (macros && !force) {
      deferred.resolve(macros);
    } else {
      var url = new XWiki.Document('MacroService', 'CKEditor').getURL('get', $.param({
        outputSyntax: 'plain',
        language: $('html').attr('lang')
      }));
      $.get(url, {data: 'list', syntaxId: syntaxId}).done(function(macros) {
        // Bulletproofing: check if the returned data is json since it could some HTML representing an error
        if (typeof macros === 'object' && Array.isArray(macros.list)) {
          var macroList = macros.list;
          if (Array.isArray(macros.notinstalled)) {
            macroList = macroList.concat(macros.notinstalled);
          }
          macrosBySyntax[syntaxId || ''] = macroList;
          allMacrosExcludedCategories = macros.options.allMacrosExcludedCategories;
          deferred.resolve(macroList);
        } else {
          deferred.reject.apply(deferred, arguments);
        }
      }).fail(function() {
        deferred.reject.apply(deferred, arguments);
      });
    }
    return deferred.promise();
  },

  macroListTemplate = '<ul class="macro-list form-control" tabindex="0"></ul>',
  macroListItemTemplate =
    '<li data-macroCategory="" data-macroId="" ' +
        'data-extensionId="" data-extensionVersion="" data-extensionInstallAllowed="">' +
      '<div>' +
        '<span class="macro-name"></span>' +
        '<span class="macro-extension"></span>' +
        '<span class="macro-category badge"></span>' +
      '</div>' +
      '<div class="macro-description"></div>' +
    '</li>',

  displayMacros = function(macros) {
    var list = $(macroListTemplate);
    var categories = {};
    macros.forEach(function(macro) {
      var macroCategory = macro.category || macro.defaultCategory || '';
      categories[macroCategory] = (categories[macroCategory] || 0) + 1;
      var macroListItem = $(macroListItemTemplate).attr({
        'data-macroId': macro.id.id,
        'data-macroCategory': macroCategory
      }).appendTo(list);
      macroListItem.find('.macro-name').text(macro.name);
      if (macro.extensionName) {
        var extensionName = ' - ' + macro.extensionName + ' ' + macro.extensionVersion;
        macroListItem.find('.macro-extension').text(extensionName);
        macroListItem.attr({
          'data-extensionId': macro.extensionId,
          'data-extensionVersion': macro.extensionVersion,
          'data-extensionName': macro.extensionName,
          'data-extensionInstallAllowed': macro.extensionInstallAllowed
        });
      }
      if (macroCategory === '_notinstalled') {
        macroListItem.find('.macro-category').text(translations.get('filter.category.notinstalled'));
      }
      if (macro.extensionRecommended) {
        macroListItem.find('.macro-categories-badges').append($('<span>')
          .addClass('badge').addClass('recommended').text(translations.get('recommended')));
      }
      macroListItem.find('.macro-description').text(macro.description);
    });
    var categoryFilter = createCategoryFilter(sortCategories(categories));
    var textFilter = $(document.createElement('input')).attr({
      'type': 'text',
      'class': 'macro-textFilter',
      'placeholder': translations.get('filter.text.placeholder')
    });
    var filters = $(document.createElement('div')).addClass('macro-filters input-group');
    filters.append(textFilter).append(categoryFilter);
    this.removeClass('loading').append(filters).append(list);
    // Filter the list of displayed macros to implement support for allMacrosExcludedCategories (i.e. when all macros
    // is selected, don't display macros in some given categories). More generally this makes sure that the filtering
    // is always done.
    filterMacros.call(this);
  },

  sortCategories = function(categories) {
    var otherCategoryCount = categories[''];
    var allCategoryCount = otherCategoryCount || 0;
    var notinstalledCategoryCount = categories._notinstalled;
    if (notinstalledCategoryCount) {
      allCategoryCount += notinstalledCategoryCount;
    }
    delete categories[''];
    delete categories._notinstalled;
    var categoryList = $.map(categories, function(categoryCount, categoryName) {
      if (allMacrosExcludedCategories.indexOf(categoryName) < 0) {
        allCategoryCount += categoryCount;
      }
      return {
        'id': categoryName,
        'name': categoryName,
        'count': categoryCount
      };
    }).sort(function(alice, bob) {
      return alice.name.localeCompare(bob.name);
    });
    // Put "All Macros" category first.
    categoryList.splice(0, 0, {
      name: translations.get('filter.category.all'),
      count: allCategoryCount
    });
    // Put "Other" category after other categories.
    if (otherCategoryCount) {
      categoryList.push({
        id: '',
        name: translations.get('filter.category.other'),
        count: otherCategoryCount
      });
    }
    // Put "Not installed" category last.
    if (notinstalledCategoryCount) {
      categoryList.push({
        id: '_notinstalled',
        name: translations.get('filter.category.notinstalled'),
        count: notinstalledCategoryCount
      });
    }
    return categoryList;
  },

  createCategoryFilter = function(categories) {
    var categoryFilter = $(
      '<div class="macro-categories input-group-btn">' +
        '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" ' +
          'aria-haspopup="true" aria-expanded="false"><span class="caret"></span></button>' +
        '<ul class="dropdown-menu dropdown-menu-right"></ul>' +
      '</div>'
    );
    var categoryTemplate = [
      '<li class="macro-category">',
        '<a href="#">',
          '<span class="macro-category-name"></span>',
          '<span class="macro-category-count badge"></span>',
        '</a>',
      '</li>'].join('');
    categoryFilter.find('ul.dropdown-menu').append(categories.map(function(category) {
      var item = $(categoryTemplate).attr('data-category', category.id);
      item.find('.macro-category-name').text(category.name);
      item.find('.macro-category-count').text(category.count);
      return item[0];
    }));
    var separator = '<li role="separator" class="divider"></li>';
    // Add separator after "All Macros" category.
    if (categories.length > 1) {
      categoryFilter.find('.macro-category:not([data-category])').after(separator);
    }
    // Add separator before "Other" category.
    categoryFilter.find('.macro-category[data-category=""]').before(separator);
    // Add separator before "Not installed" category.
    categoryFilter.find('.macro-category[data-category="_notinstalled"]').before(separator);
    // Select "All Macros" by default.
    categoryFilter.find('.caret').before(document.createTextNode(categories[0].name + ' '));
    return categoryFilter;
  },

  scrollIntoList = function(item) {
    var itemPositionTop = item.position().top;
    var list = item.parent();
    if (itemPositionTop < 0) {
      list.scrollTop(list.scrollTop() + itemPositionTop);
    } else {
      var delta = itemPositionTop + item.outerHeight() - list.height();
      if (delta > 0) {
        list.scrollTop(list.scrollTop() + delta);
      }
    }
  },

  filterMacros = function() {
    var text = $(this).find('.macro-textFilter').val().toLowerCase();
    var selectedCategory = $(this).find('.macro-categories .dropdown-toggle').attr('data-category');
    var macroSelector = $(this).closest('.macro-selector');
    macroSelector.find('.macro-list').scrollTop(0).children().each(function() {
      var name = $(this).find('.macro-name').text().toLowerCase();
      var description = $(this).find('.macro-description').text().toLowerCase();
      var category = $(this).attr('data-macroCategory');
      // We hide Macros located in some categories to exclude (e.g. internal and deprecated categories) so that they
      // are less visible to users, to provide a simpler user experience by not bloating the macro list with
      // macros that are less interesting to users.
      // Note that when "All Macros" is selected selectedCategory is undefined.
      var hide = (text && name.indexOf(text) < 0 && description.indexOf(text) < 0) ||
        (typeof selectedCategory === 'string' && category !== selectedCategory) ||
          (typeof selectedCategory !== 'string' && $.inArray(category, allMacrosExcludedCategories) !== -1);
      $(this).removeClass('selected').toggleClass('hidden', hide);
    }).not('.hidden').first().addClass('selected');
    macroSelector.trigger('change');
  },

  navigateMacroList = function(macroList, up) {
    var direction = up ? 'prev' : 'next';
    var selectedItem = macroList.children('.selected');
    if (selectedItem.length) {
      selectedItem = selectedItem[direction]();
    } else {
      selectedItem = macroList.children()[up ? 'last' : 'first']();
    }
    while(selectedItem.hasClass('hidden')) {
      selectedItem = selectedItem[direction]();
    }
    selectedItem.click();
  },

  maybeTriggerMacroSelection = function(macroSelector) {
    var selectedMacros = macroSelector.find('.macro-list .selected').map(function() {
      return $(this).attr('data-macroId');
    });
    if (selectedMacros.length > 0) {
      macroSelector.trigger('xwiki:macro:selected', selectedMacros);
    }
  },

  changeMacroCategory = function(event) {
    event.preventDefault();
    var selectedCategory = $(this).parent('li');
    var categoryFilter = $(this).closest('.macro-categories');
    var dropDownToggle = categoryFilter.find('.dropdown-toggle');
    var newCategoryId = selectedCategory.attr('data-category');
    var oldCategoryId = dropDownToggle.attr('data-category');
    if (newCategoryId !== oldCategoryId) {
      var caret = dropDownToggle.children('.caret').remove();
      dropDownToggle.text(selectedCategory.find('.macro-category-name').text() + ' ').append(caret);
      if (typeof newCategoryId === 'string') {
        dropDownToggle.attr('data-category', newCategoryId);
      } else {
        dropDownToggle.removeAttr('data-category');
      }
      categoryFilter.trigger('change', newCategoryId, oldCategoryId);
    }
    dropDownToggle.focus();
  },

  addMacroSelectorBehaviour = function(macroSelector) {
    macroSelector.on('click', '.macro-categories a', changeMacroCategory);
    macroSelector.on('change', '.macro-categories', filterMacros.bind(macroSelector));

    var timeoutId;
    macroSelector.on('input', '.macro-textFilter', function() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(filterMacros.bind(macroSelector), 500);
    });

    macroSelector.on('click', '.macro-list > li', function() {
      var item = $(this);
      item.addClass('selected').siblings().removeClass('selected');
      scrollIntoList(item);
      macroSelector.trigger('change');
    });

    macroSelector.on('keydown', '.macro-textFilter, .macro-list', function(event) {
      if (event.which === 38 || event.which === 40) {
        navigateMacroList(macroSelector.find('.macro-list'), event.which === 38);
        event.preventDefault();
      } else if (event.which === 13) {
        maybeTriggerMacroSelection(macroSelector);
      }
    });

    macroSelector.on('dblclick', '.macro-list', function() {
      maybeTriggerMacroSelection(macroSelector);
    });
  },

  maybeDisplayMacros = function(requestNumber, macros) {
    // Check if the list of macros corresponds to the last request.
    if (this.prop('requestNumber') === requestNumber) {
      displayMacros.call(this, macros);
      this.trigger('ready');
    }
  },

  maybeShowError = function(requestNumber) {
    // Check if the error corresponds to the last request.
    if (this.prop('requestNumber') === requestNumber) {
      var errorMessage = $('<div class="box errormessage"></div>').text(translations.get('failedToRetrieveMacros'));
      this.removeClass('loading').append(errorMessage);
    }
  },

  createMacroSelectorAPI = function(macroSelector) {
    return {
      filter: function(text, category) {
        macroSelector.find('.macro-textFilter').val(text);
        macroSelector.find('.macro-categories .dropdown-toggle').attr('data-category', category);
        filterMacros.call(macroSelector[0]);
      },
      getSelectedMacro: function() {
        return macroSelector.find('.macro-list > li.selected').attr('data-macroId');
      },
      getSelectedMacroCategory: function() {
        return macroSelector.find('.macro-list > li.selected').attr('data-macroCategory');
      },
      getSelectedExtensionId: function() {
        return macroSelector.find('.macro-list > li.selected').attr('data-extensionId');
      },
      getSelectedExtensionVersion: function() {
        return macroSelector.find('.macro-list > li.selected').attr('data-extensionVersion');
      },
      getSelectedExtensionName: function() {
        return macroSelector.find('.macro-list > li.selected').attr('data-extensionName');
      },
      getSelectedExtensionRecommended: function() {
        return macroSelector.find('.macro-list > li.selected').attr('data-extensionRecommended') == 'true';
      },
      isInstalledMacro: function() {
        return this.getSelectedMacroCategory() != '_notinstalled';
      },
      isExtensionInstallAllowed: function() {
        return macroSelector.find('.macro-list > li.selected').attr('data-extensionInstallAllowed') != 'false';
      },
      reset: function(macroId) {
        this.filter('');
        this.select(macroId);
      },
      select: function(macroId) {
        macroSelector.find('.macro-list > li').filter(function() {
          return $(this).attr('data-macroId') === macroId;
        }).click();
      },
      update: function(syntaxId, force) {
        syntaxId = syntaxId || macroSelector.attr('data-syntaxId');
        var requestNumber = (macroSelector.prop('requestNumber') || 0) + 1;
        macroSelector.empty().addClass('loading')
          .attr('data-syntaxId', syntaxId)
          .prop('requestNumber', requestNumber);
        getMacros(syntaxId, force).done(maybeDisplayMacros.bind(macroSelector, requestNumber))
          .fail(maybeShowError.bind(macroSelector, requestNumber));
      }
    };
  },

  selectMacro = $modal.createModalStep({
    'class': 'macro-selector-modal',
    title: translations.get('title'),
    content: '<div class="macro-selector loading"></div>',
    acceptLabel: translations.get('select'),
    onLoad: function() {
      var modal = this;
      var selectButton = modal.find('.modal-footer .btn-primary');
      modal.on('shown.bs.modal', function(event) {
        var input = modal.data('input') || {};
        var macroSelector = modal.find('.macro-selector');
        var macroSelectorAPI = macroSelector.data('macroSelectorAPI');
        if (!macroSelectorAPI) {
          // Create the macro selector.
          macroSelector.on('ready', function() {
            macroSelectorAPI.select(input.macroId);
            macroSelector.find('.macro-textFilter').focus();
          }).on('change', function() {
            var buttonText;
            var buttonTitle;
            var buttonDisabled = !macroSelectorAPI.getSelectedMacro();
            if (macroSelectorAPI.isInstalledMacro()) {
              buttonText = translations.get('select');
            } else {
              buttonText = translations.get('install');
              if (!macroSelectorAPI.isExtensionInstallAllowed()) {
                buttonTitle = translations.get('install.notAllowed');
                buttonDisabled = true;
              }
            }
            selectButton.text(buttonText);
            selectButton.prop('title', buttonTitle);
            selectButton.prop('disabled', buttonDisabled);
          }).on('xwiki:macro:selected', function(event, macroIds) {
            selectButton.click();
          }).attr('data-syntaxId', input.syntaxId);
          macroSelectorAPI = macroSelector.xwikiMacroSelector();
        } else {
          // Always update the list of macros since macros might have been installed or uninstalled in the meantime
          macroSelectorAPI.update(input.syntaxId, true);
        }
      });
      selectButton.on('click', function() {
        var macroSelectorAPI = modal.find('.macro-selector').xwikiMacroSelector();
        var extensionId = macroSelectorAPI.getSelectedExtensionId();
        var extensionVersion = macroSelectorAPI.getSelectedExtensionVersion();
        var extensionName = macroSelectorAPI.getSelectedExtensionName();
        // When adding a macro involves installing an extension ask for confirmation
        if (extensionId && !window.confirm(translations.get('install.confirm', extensionName, extensionVersion))) {
          return;
        }
        var output = modal.data('input') || {};
        output.macroId = macroSelectorAPI.getSelectedMacro();
        output.macroCategory = macroSelectorAPI.getSelectedMacroCategory();
        output.extensionId = extensionId;
        output.extensionVersion = extensionVersion;
        modal.data('output', output).modal('hide');
      });
    }
  });

  $.fn.xwikiMacroSelector = function() {
    this.each(function() {
      var macroSelector = $(this);
      if (!macroSelector.data('macroSelectorAPI')) {
        var macroSelectorAPI = createMacroSelectorAPI(macroSelector);
        macroSelector.data('macroSelectorAPI', macroSelectorAPI);
        addMacroSelectorBehaviour(macroSelector);
        if (macroSelector.hasClass('loading')) {
          macroSelectorAPI.update();
        } else {
          macroSelector.trigger('ready');
        }
      }
    });
    return this.data('macroSelectorAPI');
  };

  return selectMacro;
});
