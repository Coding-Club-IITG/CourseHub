import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../apis/miscellaneous/funfacts.dart';
import '../providers/navigation_provider.dart';
import '../providers/search_provider.dart';
import '../widgets/common/custom_snackbar.dart';
import '../widgets/nav_bar/search_card.dart';

class SearchScreen extends StatelessWidget {
  SearchScreen({super.key});

  final _searchController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final navigationProvider = context.read<NavigationProvider>();
    return FutureBuilder<List<dynamic>>(
        future: getFunFacts(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return Container();
          }

          return MultiProvider(
            providers: [
              ChangeNotifierProvider(
                create: (context) => SearchProvider(),
              )
            ],
            child: PopScope(
              canPop: false,
              onPopInvoked: (_) {
                navigationProvider.changePageNumber(0);
              },
              child: Stack(
                alignment: Alignment.bottomCenter,
                children: [
                  Consumer<SearchProvider>(
                    builder: (context, searchProvider, child) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                            vertical: 20, horizontal: 20),
                        width: double.infinity,
                        height: double.infinity,
                        color: Colors.white,
                        child: Column(
                          children: AnimationConfiguration.toStaggeredList(
                            duration: const Duration(milliseconds: 200),
                            childAnimationBuilder: (widget) => SlideAnimation(
                              horizontalOffset: 50.0,
                              child: FadeInAnimation(
                                child: widget,
                              ),
                            ),
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    flex: 6,
                                    child: TextField(
                                      style: const TextStyle(
                                          color: Colors.black,
                                          fontWeight: FontWeight.w400),
                                      onSubmitted: (value) async {
                                        try {
                                          await searchProvider.search(value);
                                        } catch (e) {
                                          if (!context.mounted) return;
                                          showSnackBar(
                                              'Something went wrong!', context);
                                        }
                                      },
                                      textInputAction: TextInputAction.search,
                                      controller: _searchController,
                                      keyboardType: TextInputType.name,
                                      cursorColor: Colors.grey,
                                      decoration: InputDecoration(
                                        hintText: 'Search Courses',
                                        suffixIconConstraints:
                                            const BoxConstraints(
                                          maxHeight: 32,
                                        ),
                                        suffixIcon: GestureDetector(
                                          onTap: () async {
                                            try {
                                              await searchProvider.search(
                                                  _searchController.text);
                                            } catch (e) {
                                              if (!context.mounted) {
                                                rethrow;
                                              }
                                              showSnackBar(
                                                  'Something went wrong!',
                                                  context);
                                            }
                                          },
                                          child: Padding(
                                            padding: const EdgeInsets.only(
                                                right: 12),
                                            child: SvgPicture.asset(
                                              'assets/search.svg',
                                              colorFilter:
                                                  const ColorFilter.mode(
                                                      Colors.black,
                                                      BlendMode.srcIn),
                                            ),
                                          ),
                                        ),
                                        contentPadding:
                                            const EdgeInsets.symmetric(
                                                horizontal: 12),
                                        enabledBorder: const OutlineInputBorder(
                                          borderRadius: BorderRadius.all(
                                            Radius.circular(0),
                                          ),
                                        ),
                                        focusedBorder: const OutlineInputBorder(
                                          borderRadius: BorderRadius.all(
                                            Radius.circular(0),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(
                                height: 20,
                              ),
                              SizedBox(
                                height: 200,
                                child: searchProvider.found == null
                                    ? Text(
                                        searchProvider.text,
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          color: Colors.black,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      )
                                    : searchProvider.found ?? false
                                        ? ListView.builder(
                                            physics:
                                                const BouncingScrollPhysics(),
                                            itemBuilder: (context, index) =>
                                                SearchCard(
                                              isTempCourse: true,
                                              isAvailable: searchProvider
                                                  .searchResult[index]
                                                  .isAvailable,
                                              courseCode: searchProvider
                                                  .searchResult[index].code,
                                              courseName: searchProvider
                                                  .searchResult[index].name,
                                              callback: null,
                                            ),
                                            itemCount: searchProvider
                                                .searchResult.length,
                                          )
                                        : const Text(
                                            'No Results Found!',
                                            style: TextStyle(
                                                color: Colors.black,
                                                fontWeight: FontWeight.w700),
                                          ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      SizedBox(
                        width: 300,
                        child: Column(
                          children: [
                            const Text(
                              'Fun Fact',
                              style: TextStyle(color: Colors.black),
                            ),
                            const SizedBox(
                              height: 5,
                            ),
                            Text(
                              snapshot.data![
                                      Random().nextInt(snapshot.data!.length)]
                                  .toString(),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  color: Colors.black,
                                  fontWeight: FontWeight.w400),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(
                        height: 40,
                      ),
                      Image.asset(
                        'assets/search_library.png',
                        fit: BoxFit.contain,
                      ),
                      const SizedBox(
                        height: 10,
                      )
                    ],
                  )
                ],
              ),
            ),
          );
        });
  }
}
