import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-8 safe-area-inset">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <h1 className="text-2xl font-bold mb-6">隐私政策</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">最后更新日期：2024年12月25日</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. 信息收集</h2>
            <p>
              狄邦单词通（以下简称"本应用"）在您使用服务时，可能会收集以下信息：
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>账户信息：电子邮件地址、用户名、年级、班级</li>
              <li>学习数据：单词学习进度、测试成绩、答题记录</li>
              <li>设备信息：设备类型、操作系统版本</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. 信息使用</h2>
            <p>我们收集的信息用于：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>提供、维护和改进我们的服务</li>
              <li>个性化您的学习体验</li>
              <li>追踪学习进度和成绩</li>
              <li>发送与服务相关的通知</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. 信息存储与安全</h2>
            <p>
              我们采取适当的技术和组织措施来保护您的个人信息安全。您的数据存储在安全的服务器上，
              并使用行业标准加密技术进行保护。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. 信息共享</h2>
            <p>
              我们不会出售、交易或以其他方式向外部各方转让您的个人身份信息，
              除非为了遵守法律、执行我们的网站政策或保护我们或他人的权利、财产或安全。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. 儿童隐私</h2>
            <p>
              本应用面向学生用户。我们非常重视儿童隐私保护，不会故意收集13岁以下儿童的个人信息。
              如果您是家长或监护人，发现您的孩子向我们提供了个人信息，请联系我们。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. 您的权利</h2>
            <p>您有权：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>访问您的个人信息</li>
              <li>更正不准确的信息</li>
              <li>请求删除您的账户和相关数据</li>
              <li>撤回您的同意</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. 隐私政策更新</h2>
            <p>
              我们可能会不时更新本隐私政策。我们会在应用内通知您任何重大更改。
              建议您定期查看本政策以了解我们如何保护您的信息。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. 联系我们</h2>
            <p>
              如果您对本隐私政策有任何疑问，请联系我们：
            </p>
            <p className="font-medium text-foreground">
              邮箱：support@dipontwordmaster.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
