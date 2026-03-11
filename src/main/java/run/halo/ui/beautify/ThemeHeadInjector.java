package run.halo.ui.beautify;

import java.util.Set;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.ITemplateContext;
import org.thymeleaf.model.IModel;
import org.thymeleaf.model.IModelFactory;
import org.thymeleaf.processor.element.IElementModelStructureHandler;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ReactiveSettingFetcher;
import run.halo.app.theme.dialect.TemplateHeadProcessor;

/**
 * Inject gateway beautification CSS into theme-rendered pages.
 */
@Component
public class ThemeHeadInjector implements TemplateHeadProcessor {

    private static final String CSS_BASE =
        "/plugins/plugin-ui-beautify/assets/static/";

    private static final Set<String> VALID_THEMES = Set.of(
        "default", "ocean", "dark", "sakura", "minimal", "aurora"
    );

    private final ReactiveSettingFetcher settingFetcher;

    public ThemeHeadInjector(ReactiveSettingFetcher settingFetcher) {
        this.settingFetcher = settingFetcher;
    }

    @Override
    public Mono<Void> process(ITemplateContext context, IModel model,
        IElementModelStructureHandler structureHandler) {
        return settingFetcher.get("basic")
            .filter(setting ->
                setting.path("enableGateway").asBoolean(true))
            .map(setting -> {
                String theme =
                    setting.path("gatewayTheme").asText("default");
                return VALID_THEMES.contains(theme)
                    ? theme : "default";
            })
            .doOnNext(theme -> {
                IModelFactory modelFactory =
                    context.getModelFactory();
                model.add(modelFactory.createText(
                    "<link rel=\"stylesheet\" href=\""
                        + CSS_BASE + "gateway-beautify.css\" />\n"
                        + "<link rel=\"stylesheet\" href=\""
                        + CSS_BASE + "gateway-" + theme
                        + ".css\" />\n"
                ));
            })
            .then();
    }
}
