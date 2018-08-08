# qs-ext-Pareto
Qlik Sense Pareto (ABC) Analysis

This is a quick shot to allow the assignment of A, B, C Analysis on any field for any expression. 

Just create variable "Pareto" in script 
* LET Pareto = '';

In the extension properties
* Add the Field (no Master Dimension possible, sorry) as the Extension's only Dimension
* Add your ABC Aggregation function as the Extension's only Measure (e.g. Sum(Sales)
* Click on the extension button while still in edit mode. You will get a browser alert, that the Dimension formula needs to be changed first. 
* Save app and go back to analysis mode. 

You can now click the button anytime and a working formula will be put into Variable 'Pareto' which assigns each value exactly into one class, numbered as 1, 2, and 3

All values of the Field which were outside the selection, when the button was pressed, are nulled. You could make such out-of-scope values selectable by creating another variable "X" (capital letter X) and set it to something like '-'.


