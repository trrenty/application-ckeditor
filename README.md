# CKEditor Integration with XWiki

**Note**: This extension has been moved to [xwiki-platform](https://github.com/xwiki/xwiki-platform/tree/master/xwiki-platform-core/xwiki-platform-ckeditor).
This repository is now only dedicated to bugfixes and will be moved to the attic once XWIki 13.10.x and 14.4.x support is dropped.

Adds support for editing wiki pages using [CKEditor](http://ckeditor.com/).

Starting with XWiki 8.2 this is the default WYSIWYG content editor. On older versions of XWiki this application extends the Edit menu with a new entry called 'CKEditor' that loads a new edit mode where you can edit the content of the wiki page using the CKEditor.

* Project Lead: [Marius Dumitru Florea](http://www.xwiki.org/xwiki/bin/view/XWiki/mflorea)
* [Documentation & Download](http://extensions.xwiki.org/xwiki/bin/view/Extension/CKEditor+Integration)
* [Issue Tracker](http://jira.xwiki.org/browse/CKEDITOR)
* Communication: [Mailing List](http://dev.xwiki.org/xwiki/bin/view/Community/MailingLists), [IRC]( http://dev.xwiki.org/xwiki/bin/view/Community/IRC)
* [Development Practices](http://dev.xwiki.org)
* Minimal XWiki version supported: XWiki 8.4
* License: LGPL 2.1+
* [Translations](http://l10n.xwiki.org/xwiki/bin/view/Contrib/CKEditorIntegration)
* Sonar Dashboard: N/A
* Continuous Integration Status: [![Build Status](http://ci.xwiki.org/job/XWiki%20Contrib/job/application-ckeditor/job/master/badge/icon)](http://ci.xwiki.org/view/Contrib/job/XWiki%20Contrib/job/application-ckeditor/job/master/)

## Building

You need the following in order to build this extension:
* Java 11
* Maven 3.6+
* An X Display (needed by CKBuilder)

## Release Steps

* Maven release:
```
mvn release:prepare -Pintegration-tests,docker
mvn release:perform -Pintegration-tests,docker
```
* Update the documentation page on http://extensions.xwiki.org (keep the release notes (the list of JIRA issues) only for the 2 most recent releases)
* Announce the release on https://forum.xwiki.org/c/News
* Update the version used in XWiki Standard Flavor
