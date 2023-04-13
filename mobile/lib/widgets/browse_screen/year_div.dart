import 'package:flutter/material.dart';

class YearDiv extends StatelessWidget {
  final Function(String a) callback;
  final List<String> availableYears;
  final String year;
  const YearDiv({
    super.key,
    required this.callback,
    required this.availableYears,
    required this.year,
  });

  @override
  Widget build(BuildContext context) {
    availableYears.sort((b, a) => a.compareTo(b));
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 30),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemBuilder: (context, index) {
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 5),
            child: Material(
              color: availableYears[index] == year ? Colors.black : Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(0),
                side: const BorderSide(color: Colors.black, width: 0.5),
              ),
              child: InkWell(
                onTap: () {
                  callback(availableYears[index]);
                },
                splashColor: Colors.grey,
                child: Container(
                  height: 38,
                  padding: const EdgeInsets.symmetric(horizontal: 30),
                  child: Center(
                    child: Text(
                      availableYears[index],
                      style: TextStyle(
                        fontWeight: availableYears[index] == year
                            ? FontWeight.w700
                            : FontWeight.w400,
                        fontSize: 14,
                        color: availableYears[index] != year
                            ? Colors.black
                            : Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
        itemCount: availableYears.length,
      ),
    );
  }
}
